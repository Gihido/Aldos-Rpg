// Основной класс игры для Aldos RPG веб-версии

class RPGApp {
    constructor() {
        this.currentUser = null;
        this.currentLocation = "Главная";
        this.currentMonster = null;
        this.gameContainer = document.getElementById('game-container');
        this.loadingScreen = document.getElementById('loading-screen');

        // Загружаем конфигурацию
        this.config = JSON.parse(JSON.stringify(CONFIG));
        this.ensureDefaultLoot();

        // Инициализируем приложение
        this.init();
    }

    init() {
        const savedUser = loadFromStorage('currentUser');
        if (savedUser) {
            this.currentUser = Player.fromDict(savedUser);
            this.currentLocation = this.currentUser.location || "Главная";
            this.showMainGame();
            return;
        }

        this.showAuthScreen();
    }

    hideLoadingScreen() {
        this.loadingScreen.classList.add('hidden');
    }

    showAuthScreen() {
        this.hideLoadingScreen();
        this.gameContainer.innerHTML = `
            <div class="login-form">
                <h2>Добро пожаловать в Aldos RPG!</h2>
                <div class="form-group">
                    <label for="username">Имя пользователя:</label>
                    <input type="text" id="username" placeholder="Введите имя">
                </div>
                <div class="form-group">
                    <label for="password">Пароль:</label>
                    <input type="password" id="password" placeholder="Введите пароль">
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="btn btn-primary" onclick="app.handleLogin()">Вход</button>
                    <button class="btn btn-secondary" onclick="app.showRegisterForm()">Регистрация</button>
                </div>
            </div>
        `;
    }

    showRegisterForm() {
        this.gameContainer.innerHTML = `
            <div class="register-form">
                <h2>Регистрация нового игрока</h2>
                <div class="form-group">
                    <label for="regUsername">Имя пользователя:</label>
                    <input type="text" id="regUsername" placeholder="Введите имя">
                </div>
                <div class="form-group">
                    <label for="regPassword">Пароль:</label>
                    <input type="password" id="regPassword" placeholder="Введите пароль">
                </div>
                <div class="form-group">
                    <label for="regClass">Класс персонажа:</label>
                    <select id="regClass">
                        ${PLAYER_CLASSES.map(cls => `<option value="${cls}">${cls}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="regGender">Пол:</label>
                    <select id="regGender">
                        ${PLAYER_GENDERS.map(gender => `<option value="${gender}">${gender}</option>`).join('')}
                    </select>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="btn btn-success" onclick="app.handleRegister()">Зарегистрироваться</button>
                    <button class="btn btn-secondary" onclick="app.showAuthScreen()">Назад</button>
                </div>
            </div>
        `;
    }

    handleRegister() {
        const username = document.getElementById('regUsername').value.trim();
        const password = document.getElementById('regPassword').value;
        const playerClass = document.getElementById('regClass').value;
        const gender = document.getElementById('regGender').value;

        if (!username || !password) {
            showNotification("Введите имя пользователя и пароль", "error");
            return;
        }
        if (password.length < 3) {
            showNotification("Пароль должен быть не менее 3 символов", "error");
            return;
        }

        const playersDB = this.loadPlayersDB();
        if (playersDB.players[username]) {
            showNotification("Пользователь с таким именем уже существует", "error");
            return;
        }

        this.currentUser = new Player(username, playerClass, gender);
        this.currentUser.location = "Главная";

        const userData = this.currentUser.toDict();
        userData.passwordHash = hashPassword(password);

        playersDB.players[username] = userData;
        playersDB.metadata.totalPlayers = Object.keys(playersDB.players).length;
        playersDB.metadata.lastUpdate = formatDate();

        saveToStorage('playersDB', playersDB);
        saveToStorage('currentUser', userData);

        this.currentLocation = "Главная";
        showNotification(`Регистрация успешна! Добро пожаловать, ${username}!`, "success");
        this.showMainGame();
    }

    handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            showNotification("Введите имя пользователя и пароль", "error");
            return;
        }

        const playersDB = this.loadPlayersDB();
        const userData = playersDB.players[username];
        if (!userData) {
            showNotification("Пользователь не найден", "error");
            return;
        }

        if (userData.metadata && userData.metadata.isBanned) {
            showNotification(`Аккаунт заблокирован: ${userData.metadata.banReason}`, "error");
            return;
        }

        const storedHash = userData.passwordHash;
        if (storedHash && storedHash !== hashPassword(password)) {
            showNotification("Неверный пароль", "error");
            return;
        }

        this.currentUser = Player.fromDict(userData);
        this.currentUser.metadata.lastLogin = formatDate();
        this.currentLocation = this.currentUser.location || "Главная";

        this.syncCurrentUser();
        showNotification(`Добро пожаловать, ${username}!`, "success");
        this.showMainGame();
    }

    showMainGame() {
        this.hideLoadingScreen();
        this.renderCurrentLocation();
    }

    renderCurrentLocation() {
        const locationConfig = this.config.locations[this.currentLocation];
        if (!locationConfig) {
            showNotification(`Локация ${this.currentLocation} не найдена`, "error");
            return;
        }

        this.gameContainer.innerHTML = '';

        const locationDiv = document.createElement('div');
        locationDiv.className = 'game-location active';
        locationDiv.style.backgroundColor = locationConfig.bgColor;
        locationDiv.style.color = locationConfig.fgColor;

        const titleDiv = document.createElement('div');
        titleDiv.className = 'location-title';
        titleDiv.textContent = locationConfig.title;

        locationDiv.appendChild(titleDiv);
        locationDiv.appendChild(this.renderToolbar());
        locationDiv.appendChild(this.renderLocationButtons(locationConfig));
        this.renderPlayerStats(locationDiv);

        this.syncMonsterForLocation(locationConfig);
        if (this.currentMonster && this.currentMonster.isAlive) {
            this.renderMonster(locationDiv);
        }

        if (locationConfig.lootPile?.visible) {
            this.renderLootPile(locationDiv, locationConfig.lootPile);
        }

        this.gameContainer.appendChild(locationDiv);
    }

    renderToolbar() {
        const toolbar = document.createElement('div');
        toolbar.style.display = 'flex';
        toolbar.style.gap = '10px';
        toolbar.style.justifyContent = 'center';
        toolbar.style.marginBottom = '15px';

        toolbar.innerHTML = `
            <button class="btn btn-info" onclick="app.showInventory()">🎒 Инвентарь</button>
            <button class="btn btn-warning" onclick="app.showCharacterInfo()">👤 Персонаж</button>
            <button class="btn btn-secondary" onclick="app.logout()">🚪 Выход</button>
        `;

        return toolbar;
    }

    renderLocationButtons(locationConfig) {
        const container = document.createElement('div');
        container.className = 'location-buttons';

        for (const key of Object.keys(locationConfig)) {
            if (!key.startsWith('btn')) continue;

            const btnConfig = locationConfig[key];
            const button = document.createElement('button');
            button.className = 'location-btn';
            button.textContent = btnConfig.text;
            button.style.backgroundColor = btnConfig.bg;
            button.style.color = btnConfig.fg;
            button.style.fontFamily = btnConfig.fontFamily;
            button.style.fontSize = `${btnConfig.fontSize}px`;
            button.style.fontWeight = btnConfig.bold ? 'bold' : 'normal';
            button.style.width = `${btnConfig.width}px`;
            button.style.height = `${btnConfig.height}px`;

            if (btnConfig.isTransition && btnConfig.targetLocation) {
                button.onclick = () => this.goToLocation(btnConfig.targetLocation);
            } else {
                button.onclick = () => this.handleLocationAction(key, btnConfig);
            }

            container.appendChild(button);
        }

        return container;
    }

    renderPlayerStats(container) {
        const statsDiv = document.createElement('div');
        statsDiv.className = 'player-stats';
        statsDiv.innerHTML = `
            <h3>${this.currentUser.username}</h3>
            <div class="player-stat"><span>Класс:</span><span>${this.currentUser.class}</span></div>
            <div class="player-stat"><span>Уровень:</span><span>${this.currentUser.level}</span></div>
            <div class="player-stat"><span>Опыт:</span><span>${this.currentUser.experience}/${expForNextLevel(this.currentUser.level)}</span></div>
            <div class="player-stat"><span>HP:</span><span>${this.currentUser.hp}/${this.currentUser.hpMax}</span></div>
            <div class="player-hp-bar"><div class="player-hp-fill" style="width: ${(this.currentUser.hp / this.currentUser.hpMax) * 100}%"></div></div>
            <div class="player-stat"><span>MP:</span><span>${this.currentUser.mp}/${this.currentUser.mpMax}</span></div>
            <div class="player-mp-bar"><div class="player-mp-fill" style="width: ${(this.currentUser.mp / this.currentUser.mpMax) * 100}%"></div></div>
            <div class="player-stat"><span>Атака:</span><span>${this.currentUser.minDmg}-${this.currentUser.maxDmg}</span></div>
            <div class="player-stat"><span>Защита:</span><span>${this.currentUser.defense}</span></div>
        `;

        container.appendChild(statsDiv);
    }

    syncMonsterForLocation(locationConfig) {
        if (!locationConfig.monster) {
            this.currentMonster = null;
            return;
        }

        if (this.currentMonster && this.currentMonster.isAlive) {
            return;
        }

        this.currentMonster = new Monster(
            null,
            locationConfig.monster.name,
            locationConfig.monster.hp,
            locationConfig.monster.hpMax,
            locationConfig.monster.mp,
            locationConfig.monster.mpMax,
            locationConfig.monster.minDmg,
            locationConfig.monster.maxDmg,
            locationConfig.monster.icon,
            locationConfig.monster.x,
            locationConfig.monster.y,
            locationConfig.monster.respawnTime
        );
        this.currentMonster.addLootItem(new LootItem('healing_potion', 'Малое', [0, 0], [0, 0], [0.5, 1.0], 55, 'Обычный', 'heal', [18, 30]));
        this.currentMonster.addLootItem(new LootItem('mana_potion', 'Искрящаяся', [0, 0], [0, 0], [0.5, 1.0], 35, 'Обычный', 'mana', [12, 25]));
        this.currentMonster.addLootItem(new LootItem('wolf_fang', 'Острый', [2, 5], [0, 0], [0.8, 1.5], 25, 'Редкий'));
    }

    renderMonster(container) {
        const monsterFrame = document.createElement('div');
        monsterFrame.className = 'monster-frame';
        monsterFrame.style.left = `${this.currentMonster.x}px`;
        monsterFrame.style.top = `${this.currentMonster.y}px`;

        monsterFrame.innerHTML = `
            <div class="monster-icon">${this.currentMonster.icon}</div>
            <div class="monster-name">${this.currentMonster.name}</div>
            <div class="monster-stats">HP: ${this.currentMonster.hp}/${this.currentMonster.hpMax}</div>
            <div class="monster-stats">Атака: ${this.currentMonster.minDmg}-${this.currentMonster.maxDmg}</div>
            <button class="btn btn-danger" onclick="app.startBattle()" style="margin-top: 5px;">Сражаться</button>
        `;

        container.appendChild(monsterFrame);
    }

    renderLootPile(container, lootPileConfig) {
        const lootPile = document.createElement('div');
        lootPile.className = 'loot-pile';
        lootPile.style.left = `${lootPileConfig.x}px`;
        lootPile.style.top = `${lootPileConfig.y}px`;
        lootPile.style.width = `${lootPileConfig.width}px`;
        lootPile.style.height = `${lootPileConfig.height}px`;
        lootPile.style.backgroundColor = lootPileConfig.bgColor;
        lootPile.style.color = lootPileConfig.fgColor;

        const itemsMarkup = lootPileConfig.items.length
            ? lootPileConfig.items.map(item => `<div class="loot-item" title="${item.name}" onclick="app.pickupItem('${item.id}')">${item.icon}</div>`).join('')
            : '<div style="color: white; font-size: 12px;">Пусто</div>';

        lootPile.innerHTML = `<div class="loot-title">📦 Сундук</div><div class="loot-items">${itemsMarkup}</div>`;
        container.appendChild(lootPile);
    }

    handleLocationAction(btnKey, btnConfig) {
        if (btnKey.toLowerCase().includes('chest')) {
            this.openChest();
            return;
        }

        showNotification(`Действие ${btnConfig.text} пока не реализовано`, 'warning');
    }

    openChest() {
        const lootPile = this.config.locations[this.currentLocation].lootPile;
        if (!lootPile.items.length) {
            lootPile.items.push(this.createChestItem());
            if (Math.random() > 0.4) {
                lootPile.items.push(this.createChestItem());
            }
            showNotification('Вы открыли сундук и нашли предметы!', 'loot');
        } else {
            showNotification('В сундуке уже лежит добыча.', 'info');
        }

        this.renderCurrentLocation();
    }

    createChestItem() {
        const source = Object.values(RPGApp.loadStaticItems());
        const base = source[getRandomInt(0, source.length - 1)];
        const id = generateId('loot');

        if (base.type === 'consumable') {
            return { ...base, id, value: getRandomInt(18, 40) };
        }

        if (base.type === 'weapon') {
            return { ...base, id, damage: getRandomInt(2, 7) };
        }

        if (base.type === 'armor') {
            return { ...base, id, defense: getRandomInt(1, 5) };
        }

        return { ...base, id };
    }

    pickupItem(itemId) {
        const lootPile = this.config.locations[this.currentLocation].lootPile;
        const index = lootPile.items.findIndex(item => item.id === itemId);
        if (index === -1) {
            showNotification('Предмет уже подобран', 'warning');
            return;
        }

        const item = lootPile.items[index];
        if (!this.currentUser.canCarryItem(item)) {
            showNotification('Слишком тяжелый предмет для инвентаря', 'warning');
            return;
        }

        this.currentUser.addItem(item);
        lootPile.items.splice(index, 1);
        this.syncCurrentUser();

        showNotification(`Подобрано: ${item.icon} ${item.name}`, 'success');
        this.renderCurrentLocation();
    }

    goToLocation(locationName) {
        if (this.currentMonster && this.currentMonster.isAlive) {
            showNotification('Сначала победите монстра!', 'warning');
            return;
        }

        this.currentLocation = locationName;
        this.currentUser.location = locationName;
        this.syncCurrentUser();
        this.renderCurrentLocation();
    }

    startBattle() {
        if (!this.currentMonster?.isAlive) {
            return;
        }

        this.gameContainer.innerHTML = `
            <div class="game-location active" data-location="battle">
                <div class="battle-screen">
                    <h2 class="battle-title">Бой с ${this.currentMonster.name}</h2>
                    <div class="battle-characters">
                        <div class="battle-character battle-player">
                            <div class="battle-character-icon">👤</div>
                            <div class="battle-character-name">${this.currentUser.username}</div>
                            <div class="battle-character-stats">HP: <span id="player-hp">${this.currentUser.hp}</span>/${this.currentUser.hpMax}</div>
                            <div class="battle-character-stats">MP: <span id="player-mp">${this.currentUser.mp}</span>/${this.currentUser.mpMax}</div>
                        </div>
                        <div class="battle-character battle-monster">
                            <div class="battle-character-icon">${this.currentMonster.icon}</div>
                            <div class="battle-character-name">${this.currentMonster.name}</div>
                            <div class="battle-character-stats">HP: <span id="monster-hp">${this.currentMonster.hp}</span>/${this.currentMonster.hpMax}</div>
                        </div>
                    </div>
                    <div class="battle-actions">
                        <button class="battle-btn attack" onclick="app.playerAttack()">⚔️ Атака</button>
                        <button class="battle-btn defense" onclick="app.useDefense()">🛡️ Защита</button>
                        <button class="battle-btn magic" onclick="app.useMagicAttack()">✨ Магия</button>
                        <button class="battle-btn item" onclick="app.useItem()">🧪 Предмет</button>
                        <button class="battle-btn escape" onclick="app.endBattle()">🚪 Бежать</button>
                    </div>
                </div>
            </div>
        `;
    }

    playerAttack() {
        if (!this.currentMonster?.isAlive) return this.renderCurrentLocation();

        if (this.currentUser.battleState.stunnedTurns > 0) {
            showNotification('Вы оглушены и пропускаете ход', 'warning');
            this.currentUser.updateBattleState();
            return this.monsterAttack();
        }

        const damage = this.currentUser.attack();
        const alive = this.currentMonster.takeDamage(damage);
        showNotification(`Вы нанесли ${damage} урона`, 'info');

        if (!alive) {
            this.finishBattle(true);
            return;
        }

        this.monsterAttack();
    }

    useMagicAttack() {
        if (!this.currentMonster?.isAlive) return this.renderCurrentLocation();
        const manaCost = 8;

        if (this.currentUser.mp < manaCost) {
            showNotification('Недостаточно маны для заклинания', 'warning');
            return;
        }

        this.currentUser.mp -= manaCost;
        const damage = this.currentUser.attack() + getRandomInt(4, 10);
        const alive = this.currentMonster.takeDamage(damage);
        showNotification(`Магический удар: ${damage} урона`, 'info');

        if (!alive) {
            this.finishBattle(true);
            return;
        }

        this.monsterAttack();
    }

    useDefense() {
        this.currentUser.useDefense();
        showNotification('Вы приготовились к обороне', 'info');
        this.monsterAttack();
    }

    useItem() {
        const potion = this.currentUser.inventory.find(i => i.type === 'consumable');
        if (!potion) {
            showNotification('Нет расходников в инвентаре', 'warning');
            return;
        }

        this.currentUser.useConsumable(potion);
        showNotification(`Использован предмет: ${potion.name}`, 'success');
        this.syncCurrentUser();
        this.updateBattleScreen();
    }

    monsterAttack() {
        if (!this.currentMonster?.isAlive) return this.renderCurrentLocation();

        const rawDamage = this.currentMonster.attack();
        const actualDamage = this.currentUser.battleState.defenseActive ? Math.floor(rawDamage / 2) : rawDamage;
        const result = this.currentUser.takeDamage(actualDamage);

        showNotification(`Монстр нанес ${actualDamage} урона`, 'info');

        if (!result.alive) {
            this.finishBattle(false);
            return;
        }

        this.currentUser.updateBattleState();
        this.syncCurrentUser();
        this.updateBattleScreen();
    }

    finishBattle(victory) {
        if (victory) {
            const expReward = this.currentMonster.expReward;
            const loot = this.currentMonster.generateLoot();
            const result = this.currentUser.addExperience(expReward);
            this.addLootToCurrentLocation(loot);

            this.syncCurrentUser();
            this.showBattleResult(true, this.currentMonster.name, expReward, loot, result.levelsGained || 0);
        } else {
            this.currentUser.restoreHealthAndMana();
            this.syncCurrentUser();
            this.showBattleResult(false, this.currentMonster.name, 0, [], 0);
        }

        this.currentMonster = null;
        this.renderCurrentLocation();
    }

    updateBattleScreen() {
        const playerHp = document.getElementById('player-hp');
        const playerMp = document.getElementById('player-mp');
        const monsterHp = document.getElementById('monster-hp');

        if (playerHp) playerHp.textContent = this.currentUser.hp;
        if (playerMp) playerMp.textContent = this.currentUser.mp;
        if (monsterHp && this.currentMonster) monsterHp.textContent = this.currentMonster.hp;
    }

    showBattleResult(victory, monsterName, expReward, lootItems = [], levelsGained = 0) {
        let message = victory
            ? `ПОБЕДА! Вы победили ${monsterName}!<br>Получено опыта: ${expReward}`
            : `ПОРАЖЕНИЕ! Вас победил ${monsterName}.`;

        if (levelsGained > 0) {
            message += `<br>🏆 Повышение уровня: +${levelsGained}`;
        }

        if (lootItems.length > 0) {
            message += `<br>Добыча добавлена в сундук локации.`;
        }

        showNotification(message, victory ? 'victory' : 'error', 4500);
    }

    addLootToCurrentLocation(items) {
        const lootPile = this.config.locations[this.currentLocation].lootPile;
        for (const item of items) {
            lootPile.items.push(item);
        }
    }

    showInventory() {
        const inventory = this.currentUser.inventory;
        const equippedWeapon = this.currentUser.equippedItems.weapon ? this.currentUser.equippedItems.weapon.name : 'нет';
        const equippedArmor = this.currentUser.equippedItems.armor ? this.currentUser.equippedItems.armor.name : 'нет';

        const content = `
            <div>
                <p><strong>Экипировка:</strong> оружие — ${equippedWeapon}, броня — ${equippedArmor}</p>
                <p><strong>Вес:</strong> ${this.currentUser.getCurrentInventoryWeight().toFixed(1)} / ${this.currentUser.getMaxInventoryWeight()}</p>
                <hr style="margin: 10px 0; border-color: #3f5870;">
                ${inventory.length ? inventory.map(item => `
                    <div style="display:flex; justify-content:space-between; gap:10px; margin-bottom:8px; align-items:center;">
                        <span>${item.icon} ${item.name}</span>
                        <span>
                            <button class="btn btn-info" onclick="app.inventoryAction('use','${item.id}')">Исп.</button>
                            <button class="btn btn-warning" onclick="app.inventoryAction('equip','${item.id}')">Надеть</button>
                            <button class="btn btn-danger" onclick="app.inventoryAction('drop','${item.id}')">Бросить</button>
                        </span>
                    </div>
                `).join('') : '<p>Инвентарь пуст.</p>'}
            </div>
        `;

        showModal(content, 'Инвентарь');
    }

    inventoryAction(action, itemId) {
        const item = this.currentUser.inventory.find(i => i.id === itemId);
        if (!item) {
            showNotification('Предмет не найден', 'error');
            return;
        }

        if (action === 'use' && item.type === 'consumable') {
            this.currentUser.useConsumable(item);
            showNotification(`Использовано: ${item.name}`, 'success');
        } else if (action === 'equip') {
            const check = this.currentUser.checkItemRequirements(item);
            if (!check.allowed) {
                showNotification(check.reason, 'warning');
                return;
            }
            const success = this.currentUser.equipItem(itemId);
            showNotification(success ? `Экипировано: ${item.name}` : 'Этот предмет нельзя экипировать', success ? 'success' : 'warning');
        } else if (action === 'drop') {
            this.currentUser.removeItem(itemId);
            this.config.locations[this.currentLocation].lootPile.items.push(item);
            showNotification(`Выброшено: ${item.name}`, 'info');
        } else {
            showNotification('Недоступное действие', 'warning');
        }

        this.syncCurrentUser();
        closeModal();
        this.showInventory();
        this.renderCurrentLocation();
    }

    showCharacterInfo() {
        const p = this.currentUser;
        const content = `
            <p><strong>Имя:</strong> ${p.username}</p>
            <p><strong>Класс/Пол:</strong> ${p.class} / ${p.gender}</p>
            <p><strong>Уровень:</strong> ${p.level}</p>
            <p><strong>Опыт:</strong> ${p.experience}/${expForNextLevel(p.level)}</p>
            <p><strong>Характеристики:</strong> Сила ${p.stats.strength}, Ловкость ${p.stats.agility}, Интеллект ${p.stats.intelligence}, Выносливость ${p.stats.vitality}</p>
            <p><strong>Последний вход:</strong> ${new Date(p.metadata.lastLogin).toLocaleString('ru-RU')}</p>
        `;

        showModal(content, 'Профиль персонажа');
    }

    endBattle() {
        this.renderCurrentLocation();
    }

    logout() {
        removeFromStorage('currentUser');
        this.currentUser = null;
        this.currentMonster = null;
        this.currentLocation = 'Главная';
        showNotification('Вы вышли из аккаунта', 'info');
        this.showAuthScreen();
    }

    loadPlayersDB() {
        return loadFromStorage('playersDB', {
            players: {},
            metadata: {
                created: formatDate(),
                lastUpdate: formatDate(),
                totalPlayers: 0
            }
        });
    }

    syncCurrentUser() {
        if (!this.currentUser) return;

        const playersDB = this.loadPlayersDB();
        const old = playersDB.players[this.currentUser.username] || {};
        const updated = {
            ...this.currentUser.toDict(),
            passwordHash: old.passwordHash || ''
        };

        playersDB.players[this.currentUser.username] = updated;
        playersDB.metadata.lastUpdate = formatDate();
        playersDB.metadata.totalPlayers = Object.keys(playersDB.players).length;

        saveToStorage('playersDB', playersDB);
        saveToStorage('currentUser', updated);
    }

    ensureDefaultLoot() {
        for (const loc of Object.values(this.config.locations)) {
            if (!Array.isArray(loc.lootPile.items)) {
                loc.lootPile.items = [];
            }
        }
    }

    static loadStaticItems() {
        return {
            healing_potion: {
                id: 'healing_potion_base',
                name: 'Зелье лечения',
                type: 'consumable',
                effect: 'heal',
                value: 25,
                icon: '🧪',
                weight: 0.6
            },
            mana_potion: {
                id: 'mana_potion_base',
                name: 'Зелье маны',
                type: 'consumable',
                effect: 'mana',
                value: 20,
                icon: '🔷',
                weight: 0.6
            },
            wolf_fang: {
                id: 'wolf_fang_base',
                name: 'Клык волка',
                type: 'weapon',
                subtype: 'dagger',
                damage: 4,
                icon: '🗡️',
                weight: 1.4,
                levelRequirement: 1
            },
            leather_armor: {
                id: 'leather_armor_base',
                name: 'Кожаная броня',
                type: 'armor',
                defense: 3,
                icon: '🛡️',
                weight: 3.8,
                levelRequirement: 1
            }
        };
    }
}
