// Класс монстра для Aldos RPG веб-версии

class Monster {
    constructor(id = null, name = "Монстр", hp = 10, hpMax = 10, mp = 0, mpMax = 0,
                minDmg = 1, maxDmg = 3, icon = "👹", x = 400, y = 100, respawnTime = 15,
                frameWidth = 120, frameHeight = 90) {
        this.id = id || this.generateId(name);
        this.name = name;
        this.hp = hp;
        this.hpMax = hpMax;
        this.mp = mp;
        this.mpMax = mpMax;
        this.minDmg = minDmg;
        this.maxDmg = maxDmg;
        this.icon = icon;
        this.x = x;
        this.y = y;
        this.isAlive = true;
        this.respawnTime = null;
        this.defaultRespawnTime = respawnTime;
        this.stunnedTurns = 0;
        this.defenseActive = false;
        this.lootTable = [];
        this.maxLootItems = 5;
        this.playerLootPiles = {};
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        
        this.expReward = this.calculateDefaultExp();
    }

    generateId(name = null) {
        name = name || this.name;
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
        const cleanName = name.replace(/[^a-zA-Zа-яА-Я0-9]/g, '').toLowerCase();
        return `${cleanName || 'monster'}_${timestamp}_${randomSuffix}`;
    }

    calculateDefaultExp() {
        return Math.floor(this.hpMax / 2) + (this.maxDmg * 2);
    }

    takeDamage(dmg) {
        this.hp -= dmg;
        if (this.hp <= 0) {
            this.hp = 0;
            this.isAlive = false;
            this.respawnTime = Date.now() + (this.defaultRespawnTime * 1000);
            console.log(`⚰️ Монстр ${this.name} убит! Установлен таймер возрождения на ${this.respawnTime}`);
        }
        return this.isAlive;
    }

    attack() {
        return getRandomInt(this.minDmg, this.maxDmg);
    }

    addLootItem(lootItem) {
        if (this.lootTable.length < this.maxLootItems) {
            this.lootTable.push(lootItem);
            return true;
        }
        return false;
    }

    removeLootItem(index) {
        if (index >= 0 && index < this.lootTable.length) {
            return this.lootTable.splice(index, 1)[0];
        }
        return null;
    }

    generateLoot() {
        const droppedItems = [];

        for (const lootItem of this.lootTable) {
            // Проверяем шанс выпадения
            if (getRandomInt(1, 100) <= lootItem.dropChance) {
                const itemData = lootItem.generate();
                droppedItems.push(itemData);
            }
        }

        return droppedItems;
    }

    toDict() {
        return {
            id: this.id,
            name: this.name,
            hp: this.hp,
            hpMax: this.hpMax,
            mp: this.mp,
            mpMax: this.mpMax,
            minDmg: this.minDmg,
            maxDmg: this.maxDmg,
            icon: this.icon,
            x: this.x,
            y: this.y,
            isAlive: this.isAlive,
            respawnTime: this.respawnTime,
            defaultRespawnTime: this.defaultRespawnTime,
            stunnedTurns: this.stunnedTurns,
            defenseActive: this.defenseActive,
            lootTable: this.lootTable.map(item => item.toDict()),
            maxLootItems: this.maxLootItems,
            expReward: this.expReward,
            frameWidth: this.frameWidth,
            frameHeight: this.frameHeight
        };
    }

    static fromDict(data) {
        if (!data || typeof data !== 'object') {
            console.warn('Некорректные данные для монстра:', data);
            return null;
        }

        const respawnTime = data.defaultRespawnTime || 15;
        const frameWidth = data.frameWidth || 120;
        const frameHeight = data.frameHeight || 90;

        // Создаем объект монстра
        const m = new Monster(
            data.id,
            data.name || "Монстр",
            data.hp || 10,
            data.hpMax || 10,
            data.mp || 0,
            data.mpMax || 0,
            data.minDmg || 1,
            data.maxDmg || 3,
            data.icon || "👹",
            data.x || 400,
            data.y || 100,
            respawnTime,
            frameWidth,
            frameHeight
        );

        // Копируем все атрибуты из данных
        for (const [k, v] of Object.entries(data)) {
            if (m.hasOwnProperty(k) && v !== null) {
                m[k] = v;
            }
        }

        // Особо важно: явно устанавливаем respawnTime если он есть в данных
        if ('respawnTime' in data) {
            m.respawnTime = data.respawnTime;
        }

        // Устанавливаем isAlive
        if (!('isAlive' in data)) {
            m.isAlive = m.hp > 0;
        }

        // Загружаем таблицу лута
        m.lootTable = [];
        const lootData = data.lootTable || [];
        for (const lootItemData of lootData) {
            const lootItem = LootItem.fromDict(lootItemData);
            if (lootItem) {
                m.lootTable.push(lootItem);
            }
        }

        m.maxLootItems = data.maxLootItems || 5;

        // Устанавливаем опыт
        if ('expReward' in data) {
            m.expReward = data.expReward;
        } else {
            m.expReward = m.calculateDefaultExp();
        }

        return m;
    }
}

// Класс генерируемого лута
class LootItem {
    constructor(baseItemId, namePrefix = "", damageRange = [1, 10], defenseRange = [1, 5],
                weightRange = [1.0, 3.0], dropChance = 10, rarity = "Обычный",
                effectType = "heal", consumableEffectRange = [10, 30]) {
        this.baseItemId = baseItemId;
        this.namePrefix = namePrefix;
        this.damageRange = damageRange;
        this.defenseRange = defenseRange;
        this.weightRange = weightRange;
        this.dropChance = dropChance;
        this.rarity = rarity;
        this.effectType = effectType;

        // Диапазон для расходников
        this.consumableEffectRange = consumableEffectRange;
    }

    generate() {
        // Загружаем базовые предметы (в реальной версии это будет из внешнего источника)
        const items = RPGApp.loadStaticItems() || {};

        const baseItem = items[this.baseItemId] || {};

        // Генерация уникального ID
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
        const generatedId = `${this.baseItemId}_loot_${timestamp}_${randomSuffix}`;

        // Генерация статистик в пределах диапазона
        const generatedStats = {
            id: generatedId,
            baseItemId: this.baseItemId,
            name: `${this.namePrefix} ${baseItem.name || 'Предмет'}`,
            type: baseItem.type || "unknown",
            subtype: baseItem.subtype || "",
            icon: baseItem.icon || "📦",
            weight: parseFloat((Math.random() * (this.weightRange[1] - this.weightRange[0]) + this.weightRange[0]).toFixed(1)),
            classRequirement: baseItem.classRequirement || "",
            rarity: this.rarity
        };

        // Генерация урона или защиты в зависимости от типа
        if (baseItem.type === "weapon") {
            generatedStats.damage = getRandomInt(this.damageRange[0], this.damageRange[1]);
        } else if (baseItem.type === "armor") {
            generatedStats.defense = getRandomInt(this.defenseRange[0], this.defenseRange[1]);
        } else if (baseItem.type === "consumable") {
            generatedStats.effect = this.effectType;
            // Генерируем значение эффекта в заданном диапазоне
            const [minEff, maxEff] = this.consumableEffectRange;
            generatedStats.value = getRandomInt(minEff, maxEff);
        }

        if (baseItem.levelRequirement) {
            generatedStats.levelRequirement = baseItem.levelRequirement;
        }

        return generatedStats;
    }

    toDict() {
        return {
            baseItemId: this.baseItemId,
            namePrefix: this.namePrefix,
            damageRange: this.damageRange,
            defenseRange: this.defenseRange,
            weightRange: this.weightRange,
            dropChance: this.dropChance,
            rarity: this.rarity,
            effectType: this.effectType,
            consumableEffectRange: this.consumableEffectRange
        };
    }

    static fromDict(data) {
        if (!data) return null;

        const lootItem = new LootItem(
            data.baseItemId,
            data.namePrefix || "",
            data.damageRange || [1, 10],
            data.defenseRange || [1, 5],
            data.weightRange || [1.0, 3.0],
            data.dropChance || 10,
            data.rarity || "Обычный",
            data.effectType || "heal",
            data.consumableEffectRange || [10, 30]
        );

        return lootItem;
    }
}