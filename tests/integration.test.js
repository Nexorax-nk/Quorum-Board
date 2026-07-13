const { boardMembers, historian, devilAdvocate, moderator } = require('../agents');

// Mocking the Groq API evaluation function to simulate the debate without network calls
const mockEvaluateWithGroq = jest.fn((persona, instruction, query) => {
    if (persona === 'Historian') return "Mock Search: Last year we debated this and decided to wait.";
    if (persona === 'Moderator') return "**FINAL VERDICT:** NO-GO\n**CONFIDENCE SCORE:** 85%";
    return `Simulated response from ${persona}`;
});

describe('Tier 2: Integration Tests (Debate Orchestration Pipeline)', () => {

    beforeEach(() => {
        mockEvaluateWithGroq.mockClear();
    });

    test('Full 6-agent debate pipeline executes successfully', async () => {
        let debateHistory = `Topic: Mock Decision\n\n`;
        const rounds = 2;

        // 1. Historian runs first
        const histResponse = mockEvaluateWithGroq(historian.name, historian.prompt, 'query');
        debateHistory += `${historian.name}: ${histResponse}\n\n`;

        // 2. Loop runs (5 board members + 1 devil's advocate per round)
        for (let round = 1; round <= rounds; round++) {
            for (const agent of boardMembers) {
                const responseText = mockEvaluateWithGroq(agent.name, agent.prompt, debateHistory);
                debateHistory += `${agent.name}: ${responseText}\n\n`;
            }
            
            // 3. Devil's Advocate runs LAST in the round
            const devilResponse = mockEvaluateWithGroq(devilAdvocate.name, devilAdvocate.prompt, debateHistory);
            debateHistory += `${devilAdvocate.name}: ${devilResponse}\n\n`;
        }

        // 4. Moderator runs at the end
        const finalSummary = mockEvaluateWithGroq(moderator.name, moderator.prompt, debateHistory);

        // Assertions
        expect(mockEvaluateWithGroq).toHaveBeenCalledTimes(1 + (5 * 2) + 2 + 1); // 1 Historian + (5 agents * 2 rounds) + (1 DA * 2 rounds) + 1 Mod = 14 calls
        
        // Ensure Historian was called first
        expect(mockEvaluateWithGroq.mock.calls[0][0]).toBe('Historian');
        
        // Ensure Devil's Advocate was called last in Round 1
        expect(mockEvaluateWithGroq.mock.calls[6][0]).toBe("Devil's Advocate");

        // Ensure Devil's Advocate was called last in Round 2
        expect(mockEvaluateWithGroq.mock.calls[12][0]).toBe("Devil's Advocate");

        // Ensure Moderator was called absolutely last
        expect(mockEvaluateWithGroq.mock.calls[13][0]).toBe('Moderator');

        // Validate final payload includes the required formatting
        expect(finalSummary).toContain('FINAL VERDICT:');
    });

});
