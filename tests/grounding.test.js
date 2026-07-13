require('dotenv').config();
const { evaluateWithGroq } = require('../services/llm');
const { historian } = require('../agents');
const legal = require('../agents/legal');

describe('Tier 3: Live Grounding & Anti-Hallucination Tests', () => {
    
    // Increase timeout since we are making live API calls
    jest.setTimeout(15000);

    test('Historian strictly uses injected external data (Slack Search) without hallucinating', async () => {
        // We inject completely fake "search data" to prove the LLM isn't relying on its pre-trained knowledge
        const mockSearchData = `Search Results from Slack Archives:\n- "We launched Project Zephyr last month and it caused a 40% drop in user engagement."\n- "Project Zephyr's DB schema was completely corrupted."`;
        
        const instruction = `You are the ${historian.name}. ${historian.prompt}\n${mockSearchData}\nProvide a 2-3 sentence historical context based ONLY on these search results.`;
        
        const response = await evaluateWithGroq(historian.name, instruction, "Topic: Should we reboot Project Zephyr?");
        
        // Assert that it explicitly references the injected data
        expect(response.toLowerCase()).toContain('zephyr');
        expect(response.toLowerCase()).toMatch(/40%|corrupted|schema|engagement/);
    });

    test('Legal agent refuses to hallucinate business opinions', async () => {
        const instruction = `You are the ${legal.name}. ${legal.prompt}\nThis is Round 1. Make your opening statement (2-3 sentences). Do NOT hedge or be polite. Be highly opinionated according to your persona.`;
        
        const response = await evaluateWithGroq(legal.name, instruction, "Topic: Should we increase our marketing budget by $50k?");
        
        // Assert that the Legal agent stays in its lane and cites frameworks or liabilities, not ROI
        expect(response.toLowerCase()).not.toContain('roi');
        expect(response.toLowerCase()).not.toContain('revenue');
        expect(response.toLowerCase()).toMatch(/compliance|liability|risk|gdpr|soc2|hipaa|legal|regulatory/);
    });

});
