require('dotenv').config();
const { App } = require('@slack/bolt');
const { evaluateWithGroq } = require('./services/llm');
const { boardMembers, historian, devilAdvocate, moderator } = require('./agents');

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    port: process.env.PORT || 3000
});

app.command('/board', async ({ command, ack, respond, client }) => {
    // Acknowledge command request
    await ack();

    const decision = command.text;

    if (!decision) {
        await respond({
            text: "Please provide a decision to evaluate. Example: `/board Should we migrate to MongoDB?`",
            response_type: "ephemeral"
        });
        return;
    }

    let threadTs;
    try {
        const initialMsg = await client.chat.postMessage({
            channel: command.channel_id,
            text: `🏛️ *The AI Executive Board is convening to discuss:* "${decision}"\n_Please wait while the executives review..._`
        });
        threadTs = initialMsg.ts;

        let debateHistory = `Topic: ${decision}\n\n`;

        // --- STEP 1: HISTORIAN (REAL-TIME SEARCH) ---
        let searchData = "";
        try {
            // Attempt to use Slack's Real-Time Search API. 
            // Note: This often requires a user token (xoxp). If it fails with a bot token, we fallback to a mock to ensure the demo works.
            const searchResult = await client.search.messages({
                query: decision,
                sort: "timestamp",
                sort_dir: "desc",
                count: 5
            });
            if (searchResult.messages && searchResult.messages.matches.length > 0) {
                searchData = searchResult.messages.matches.map(m => m.text).join('\n');
            } else {
                searchData = "No recent slack discussions found on this topic.";
            }
        } catch (err) {
            console.warn("Search API failed (likely missing user token). Falling back to mock data for demo purposes.");
            // Mock data for hackathon demo
            searchData = `Mock Search Results:\n- "Last time we did a DB migration, it took 6 months instead of 2."\n- "Engineering complains about MongoDB lack of ACID compliance."\n- "We are spending $40k/mo on RDS right now."`;
        }

        const historianInstruction = `You are the ${historian.name}. ${historian.prompt}\nSearch Results from Slack Archives:\n${searchData}\nProvide a 2-3 sentence historical context based ONLY on these search results.`;
        const historianResponse = await evaluateWithGroq(historian.name, historianInstruction, `Topic: ${decision}`);
        
        debateHistory += `${historian.name}: ${historianResponse}\n\n`;

        await client.chat.postMessage({
            channel: command.channel_id,
            thread_ts: threadTs,
            text: `*${historian.role}:*\n${historianResponse}`
        });

        await new Promise(r => setTimeout(r, 3000));

        // --- STEP 2: BOARD DEBATE LOOP ---
        const rounds = 2; // 2 rounds to prevent overly long debates. Round 1 is opinions, Round 2 is evidence.

        for (let round = 1; round <= rounds; round++) {
            // Standard Board Members
            for (const agent of boardMembers) {
                const isFirstRound = round === 1;
                let instruction = `You are the ${agent.name}. ${agent.prompt}\n`;
                if (isFirstRound) {
                    instruction += `This is Round 1. Make your opening statement (2-3 sentences). Do NOT hedge or be polite. Be highly opinionated according to your persona.`;
                } else {
                    instruction += `This is Round ${round}. Read the debate history and directly attack another member's point. IMPORTANT: Do NOT just say 'I disagree'. Introduce new fabricated evidence (a specific metric, a customer quote, a dollar amount, a compliance deadline) to advance your argument.`;
                }

                const responseText = await evaluateWithGroq(agent.name, instruction, `Debate History:\n${debateHistory}`);
                debateHistory += `${agent.name}: ${responseText}\n\n`;

                await client.chat.postMessage({
                    channel: command.channel_id,
                    thread_ts: threadTs,
                    text: `*${agent.role}:*\n${responseText}`
                });

                await new Promise(r => setTimeout(r, 3000));
            }

            // Devil's Advocate always speaks LAST in the round to attack the emerging consensus
            let devilInstruction = `You are the ${devilAdvocate.name}. ${devilAdvocate.prompt}\nThis is Round ${round}. Read the debate history. Identify what the group is starting to agree on, and gleefully attack that specific consensus. Point out the catastrophic blind spot they are all missing (2-3 sentences).`;
            const devilResponse = await evaluateWithGroq(devilAdvocate.name, devilInstruction, `Debate History:\n${debateHistory}`);
            debateHistory += `${devilAdvocate.name}: ${devilResponse}\n\n`;

            await client.chat.postMessage({
                channel: command.channel_id,
                thread_ts: threadTs,
                text: `*${devilAdvocate.role}:*\n${devilResponse}`
            });

            await new Promise(r => setTimeout(r, 3000));
        }

        // --- STEP 3: MODERATOR SUMMARY ---
        await client.chat.postMessage({
            channel: command.channel_id,
            thread_ts: threadTs,
            text: `_👔 The Moderator is synthesizing the debate..._`
        });

        await new Promise(r => setTimeout(r, 3000));

        const finalSummary = await evaluateWithGroq(
            moderator.name,
            moderator.prompt,
            `Decision: ${decision}\n\nDebate History:\n${debateHistory}`
        );

        // Send the final result in the thread
        await client.chat.postMessage({
            channel: command.channel_id,
            thread_ts: threadTs,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*${moderator.role}'s Verdict:*\n${finalSummary}`
                    }
                }
            ],
            text: "The board has reached a conclusion."
        });

    } catch (error) {
        console.error(error);
        await client.chat.postMessage({
            channel: command.channel_id,
            text: "❌ An error occurred while consulting the board. Please check the logs."
        });
    }
});

(async () => {
    await app.start();
    console.log('⚡️ Quorum Board is running with extreme persona optimization and Historian RTS!');
})();
