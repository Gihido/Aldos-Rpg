// Конфигурация для Aldos RPG веб-версии
const CONFIG = {
    locations: {
        "Главная": {
            title: "📍 Главная локация",
            bgColor: "#FFFFFF",
            fgColor: "#000000",
            monsters: null,
            lootPile: {
                x: 20,
                y: 350,
                width: 200,
                height: 120,
                visible: true,
                bgColor: "#8B4513",
                fgColor: "#FFFFFF",
                items: []
            },
            btnForest: {
                text: "🌲 Перелесок",
                fontFamily: "Arial",
                fontSize: 12,
                bold: true,
                bg: "#4CAF50",
                fg: "#FFFFFF",
                x: 200,
                y: 150,
                width: 200,
                height: 50,
                isTransition: true,
                targetLocation: "Перелесок"
            },
            btnChest: {
                text: "🎒 Сундук",
                fontFamily: "Arial",
                fontSize: 12,
                bold: true,
                bg: "#FF9800",
                fg: "#FFFFFF",
                x: 200,
                y: 220,
                width: 200,
                height: 50,
                isTransition: false,
                targetLocation: null
            }
        },
        "Перелесок": {
            title: "🌿 Перелесок",
            bgColor: "#F5F5F5",
            fgColor: "#000000",
            monster: {
                name: "Волк",
                hp: 10, 
                hpMax: 10,
                mp: 5, 
                mpMax: 5,
                minDmg: 2, 
                maxDmg: 4,
                icon: "🐺",
                x: 420, 
                y: 120,
                respawnTime: 15
            },
            monsterBgColor: "#FFFFFF",
            monsterFgColor: "#000000",
            lootPile: {
                x: 20,
                y: 350,
                width: 200,
                height: 120,
                visible: true,
                bgColor: "#8B4513",
                fgColor: "#FFFFFF",
                items: []
            },
            btnRuins: {
                text: "🏚️ Развалины",
                fontFamily: "Arial",
                fontSize: 12,
                bold: true,
                bg: "#9E9E9E",
                fg: "#FFFFFF",
                x: 100,
                y: 150,
                width: 180,
                height: 50,
                isTransition: true,
                targetLocation: "Развалины"
            },
            btnCave: {
                text: "🕳️ Пещера",
                fontFamily: "Arial",
                fontSize: 12,
                bold: true,
                bg: "#607D8B",
                fg: "#FFFFFF",
                x: 320,
                y: 150,
                width: 180,
                height: 50,
                isTransition: true,
                targetLocation: "Пещера"
            }
        },
        "Развалины": {
            title: "🏚️ Развалины",
            bgColor: "#ECEFF1",
            fgColor: "#000000",
            monster: null,
            lootPile: {
                x: 20,
                y: 350,
                width: 200,
                height: 120,
                visible: true,
                bgColor: "#8B4513",
                fgColor: "#FFFFFF",
                items: []
            }
        },
        "Пещера": {
            title: "🕳️ Пещера",
            bgColor: "#CFD8DC",
            fgColor: "#000000",
            monster: null,
            lootPile: {
                x: 20,
                y: 350,
                width: 200,
                height: 120,
                visible: true,
                bgColor: "#8B4513",
                fgColor: "#FFFFFF",
                items: []
            }
        }
    },
    window: {
        title: "Aldos RPG",
        width: 600,
        height: 450,
        bg: "#FFFFFF"
    }
};

// Типы уведомлений
const NOTIFICATION_TYPES = {
    info: { bg: "#2196F3", icon: "ℹ️", border: "#1976D2" },
    success: { bg: "#4CAF50", icon: "✅", border: "#388E3C" },
    warning: { bg: "#FF9800", icon: "⚠️", border: "#F57C00" },
    error: { bg: "#f44336", icon: "❌", border: "#D32F2F" },
    victory: { bg: "#9C27B0", icon: "🎉", border: "#7B1FA2" },
    loot: { bg: "#FF9800", icon: "📦", border: "#F57C00" },
    level: { bg: "#7B1FA2", icon: "⭐", border: "#6A1B9A" }
};

// Классы персонажей
const PLAYER_CLASSES = [
    "Воин",
    "Маг",
    "Лучник",
    "Разбойник",
    "Жрец"
];

// Пол персонажа
const PLAYER_GENDERS = [
    "Мужчина",
    "Женщина"
];