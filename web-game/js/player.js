// Класс игрока для Aldos RPG веб-версии

class Player {
    constructor(username = "", playerClass = "Воин", gender = "Мужчина", 
                hp = 100, hpMax = 100, mp = 50, mpMax = 50, 
                minDmg = 5, maxDmg = 10, defense = 2) {
        this.username = username;
        this.class = playerClass;
        this.gender = gender;
        this.hp = hp;
        this.hpMax = hpMax;
        this.mp = mp;
        this.mpMax = mpMax;
        this.minDmg = minDmg;
        this.maxDmg = maxDmg;
        this.defense = defense;
        this.level = 1;
        this.experience = 0;
        this.inventory = [];
        this.equippedItems = {
            weapon: null,
            armor: null
        };
        this.abilities = []; // Список доступных умений
        this.currentAbilities = []; // Умения, выбранные для боя
        this.location = "Главная"; // Текущая локация
        this.stats = {
            strength: 10,
            agility: 10,
            intelligence: 10,
            vitality: 10
        };
        this.battleState = {
            stunnedTurns: 0,
            defenseActive: false
        };
        
        // Метаданные
        this.metadata = {
            created: formatDate(),
            lastLogin: formatDate(),
            isBanned: false,
            banReason: "",
            isAdmin: username.toLowerCase() === "admin" || username.toLowerCase() === "gihido"
        };
    }

    // Получить текущий уровень
    getCurrentLevel() {
        return this.level;
    }

    // Добавить опыт
    addExperience(exp) {
        if (exp <= 0) return false;
        
        this.experience += exp;
        const oldLevel = this.level;
        this.level = calculateLevel(this.experience);
        
        if (this.level > oldLevel) {
            // Игрок получил новый уровень
            const levelsGained = this.level - oldLevel;
            
            // Увеличиваем параметры при повышении уровня
            for (let i = 0; i < levelsGained; i++) {
                this.hpMax += 10;
                this.mpMax += 5;
                this.minDmg += 2;
                this.maxDmg += 2;
                this.defense += 1;
            }
            
            // Восстанавливаем здоровье и ману до максимума
            this.hp = this.hpMax;
            this.mp = this.mpMax;
            
            return { leveledUp: true, levelsGained, newLevel: this.level };
        }
        
        return { leveledUp: false };
    }

    // Атака
    attack() {
        let damage = getRandomInt(this.minDmg, this.maxDmg);
        
        // Учитываем экипированный предмет
        if (this.equippedItems.weapon && this.equippedItems.weapon.damage) {
            damage += this.equippedItems.weapon.damage;
        }
        
        return damage;
    }

    // Получить урон
    takeDamage(damage) {
        let actualDamage = damage;
        
        // Учитываем защиту
        if (this.equippedItems.armor && this.equippedItems.armor.defense) {
            actualDamage = Math.max(1, actualDamage - this.equippedItems.armor.defense);
        }
        
        actualDamage = Math.max(1, actualDamage - this.defense);
        
        this.hp -= actualDamage;
        
        if (this.hp <= 0) {
            this.hp = 0;
            return { alive: false, damageTaken: actualDamage };
        }
        
        return { alive: true, damageTaken: actualDamage };
    }

    // Использовать расходник
    useConsumable(consumable) {
        if (!consumable || consumable.type !== "consumable") {
            return false;
        }
        
        switch (consumable.effect) {
            case "heal":
                this.hp = Math.min(this.hpMax, this.hp + consumable.value);
                break;
            case "mana":
                this.mp = Math.min(this.mpMax, this.mp + consumable.value);
                break;
            default:
                return false;
        }
        
        // Удаляем использованный предмет из инвентаря
        const index = this.inventory.findIndex(item => item.id === consumable.id);
        if (index !== -1) {
            this.inventory.splice(index, 1);
        }
        
        return true;
    }

    // Экипировать предмет
    equipItem(itemId) {
        const itemIndex = this.inventory.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return false;
        
        const item = this.inventory[itemIndex];
        
        if (item.type === "weapon") {
            // Снимаем предыдущее оружие
            if (this.equippedItems.weapon) {
                this.inventory.push(this.equippedItems.weapon);
            }
            
            // Экипируем новое оружие
            this.equippedItems.weapon = item;
            this.inventory.splice(itemIndex, 1);
            return true;
        } else if (item.type === "armor") {
            // Снимаем предыдущую броню
            if (this.equippedItems.armor) {
                this.inventory.push(this.equippedItems.armor);
            }
            
            // Экипируем новую броню
            this.equippedItems.armor = item;
            this.inventory.splice(itemIndex, 1);
            return true;
        }
        
        return false;
    }

    // Снять предмет
    unequipItem(slot) {
        if (slot !== "weapon" && slot !== "armor") return false;
        
        const item = this.equippedItems[slot];
        if (!item) return false;
        
        this.equippedItems[slot] = null;
        this.inventory.push(item);
        return true;
    }

    // Добавить предмет в инвентарь
    addItem(item) {
        this.inventory.push(item);
        return true;
    }

    // Удалить предмет из инвентаря
    removeItem(itemId) {
        const index = this.inventory.findIndex(item => item.id === itemId);
        if (index !== -1) {
            return this.inventory.splice(index, 1)[0];
        }
        return null;
    }

    // Проверить требования к уровню и классу для предмета
    checkItemRequirements(item) {
        if (item.levelRequirement && item.levelRequirement > this.level) {
            return { allowed: false, reason: `Требуется уровень ${item.levelRequirement}` };
        }
        
        if (item.classRequirement && item.classRequirement !== this.class) {
            return { allowed: false, reason: `Требуется класс ${item.classRequirement}` };
        }
        
        return { allowed: true };
    }

    // Получить максимальный вес инвентаря (временно фиксированное значение)
    getMaxInventoryWeight() {
        return 100 + (this.stats.strength * 5);
    }

    // Получить текущий вес инвентаря
    getCurrentInventoryWeight() {
        return this.inventory.reduce((total, item) => total + (item.weight || 0), 0);
    }

    // Проверить, может ли игрок подобрать предмет
    canCarryItem(item) {
        const currentWeight = this.getCurrentInventoryWeight();
        const itemWeight = item.weight || 0;
        return (currentWeight + itemWeight) <= this.getMaxInventoryWeight();
    }

    // Восстановить здоровье и ману
    restoreHealthAndMana() {
        this.hp = this.hpMax;
        this.mp = this.mpMax;
    }

    // Обновить состояние боя
    updateBattleState() {
        if (this.battleState.stunnedTurns > 0) {
            this.battleState.stunnedTurns--;
        }
        
        // Сбросить активную защиту после боя
        this.battleState.defenseActive = false;
    }

    // Пропустить ход (использовать защиту)
    useDefense() {
        this.battleState.defenseActive = true;
        return true;
    }

    // Сохранить в объект
    toDict() {
        return {
            username: this.username,
            class: this.class,
            gender: this.gender,
            hp: this.hp,
            hpMax: this.hpMax,
            mp: this.mp,
            mpMax: this.mpMax,
            minDmg: this.minDmg,
            maxDmg: this.maxDmg,
            defense: this.defense,
            level: this.level,
            experience: this.experience,
            inventory: this.inventory,
            equippedItems: this.equippedItems,
            abilities: this.abilities,
            currentAbilities: this.currentAbilities,
            location: this.location,
            stats: this.stats,
            battleState: this.battleState,
            metadata: this.metadata
        };
    }

    // Загрузить из объекта
    static fromDict(data) {
        if (!data) return null;
        
        const player = new Player(
            data.username || "",
            data.class || "Воин",
            data.gender || "Мужчина",
            data.hp || 100,
            data.hpMax || 100,
            data.mp || 50,
            data.mpMax || 50,
            data.minDmg || 5,
            data.maxDmg || 10,
            data.defense || 2
        );
        
        // Копируем остальные свойства
        player.level = data.level || 1;
        player.experience = data.experience || 0;
        player.inventory = data.inventory || [];
        player.equippedItems = data.equippedItems || { weapon: null, armor: null };
        player.abilities = data.abilities || [];
        player.currentAbilities = data.currentAbilities || [];
        player.location = data.location || "Главная";
        player.stats = data.stats || {
            strength: 10,
            agility: 10,
            intelligence: 10,
            vitality: 10
        };
        player.battleState = data.battleState || {
            stunnedTurns: 0,
            defenseActive: false
        };
        player.metadata = data.metadata || {
            created: formatDate(),
            lastLogin: formatDate(),
            isBanned: false,
            banReason: "",
            isAdmin: (data.username || "").toLowerCase() === "admin" || (data.username || "").toLowerCase() === "gihido"
        };
        
        return player;
    }
}