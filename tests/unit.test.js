const { boardMembers, historian, devilAdvocate, moderator } = require('../agents');

describe('Tier 1: Unit Tests (Agent Validation)', () => {
    
    test('All 5 core board members are correctly configured', () => {
        expect(boardMembers.length).toBe(5);
        boardMembers.forEach(agent => {
            expect(agent).toHaveProperty('role');
            expect(agent).toHaveProperty('name');
            expect(agent).toHaveProperty('prompt');
            expect(typeof agent.prompt).toBe('string');
            expect(agent.prompt.length).toBeGreaterThan(20);
        });
    });

    test('Historian agent is correctly configured for RTS API injection', () => {
        expect(historian.name).toBe('Historian');
        expect(historian.prompt).toContain('Corporate Historian');
        expect(historian.prompt).toContain('Slack');
    });

    test("Devil's Advocate is configured as an aggressive consensus attacker", () => {
        expect(devilAdvocate.name).toBe("Devil's Advocate");
        expect(devilAdvocate.prompt).toContain('consensus');
    });

    test('Moderator enforces strict formatting constraints', () => {
        expect(moderator.name).toBe('Moderator');
        expect(moderator.prompt).toContain('FINAL VERDICT:');
        expect(moderator.prompt).toContain('CONFIDENCE SCORE:');
    });

});
