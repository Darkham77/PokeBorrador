
// Test Script for Nursery Missions Scaling
// To be run in the browser console or simulated

function testMissionScaling() {
    console.log("=== Testing Nursery Mission Scaling ===");
    
    const levels = [1, 20, 50, 80];
    
    levels.forEach(lvl => {
        console.log(`\n--- Testing Level ${lvl} ---`);
        state.trainerLevel = lvl;
        
        for (let i = 0; i < 5; i++) {
            const mission = _createNewMissionObject("2026-03-22");
            console.log(`Mission ${i+1}:`);
            console.log(`  Target: ${mission.targetId}`);
            console.log(`  Requirement: ${mission.reqText}`);
            console.log(`  Reward: ${mission.reward.name} x${mission.reward.qty}`);
        }
    });
}

// Mocking required global state if not present (for standalone runs)
if (typeof state === 'undefined') {
    globalThis.state = { trainerLevel: 1 };
}
if (typeof POKEMON_DB === 'undefined') {
    globalThis.POKEMON_DB = { 
        caterpie: { name: 'Caterpie' }, 
        arcanine: { name: 'Arcanine' },
        pidgey: { name: 'Pidgey' }
    };
}
if (typeof TRAINER_TYPES === 'undefined') {
    globalThis.TRAINER_TYPES = { default: { name: 'Trainer', sprite: '' } };
}
