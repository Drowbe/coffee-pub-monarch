// ================================================================== 
// ===== EXPORTS ====================================================
// ================================================================== 

// Import module.json
import moduleData from '../module.json' assert { type: 'json' };

export const MODULE = {
    ID: moduleData.id, // coffee-pub-monarch
    NAME: 'MONARCH', // BLACKSMITH or moduleData.title.toUpperCase().replace(/\s+/g, '_')
    TITLE: moduleData.title, // Coffee Pub Monarch
    AUTHOR: moduleData.authors[0]?.name || 'COFFEE PUB',
    VERSION: moduleData.version,
    DESCRIPTION: moduleData.description
};
