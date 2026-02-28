// Основной класс игры для Aldos RPG веб-версии

class RPGApp {
    constructor() {
        this.currentUser = null;
        this.currentLocation = "Главная";
        this.currentMonster = null;

        this.gameContainer = document.getElementById('game-container');
        this.loadingScreen = document.getElementById('loading-screen');

        this.config = JSON.parse(JSON.stringify(CONFIG));
        this.ensureDefaultLoot();
        this.init();
    }

    init() {
        const savedUser = loadFromStorage('currentUser');
        if (savedUser) {
            this.currentUser = Player.fromDict(savedUser);
            this.currentLocation = this.currentUser.location || 'Главная';
            this.showMainGame();
            return;
        }
        this.showAuthScreen();
    }

    hideLoadingScreen() {
        this.loadingScreen.classList.add('hidden');
    }

    showMainGame() {
        this.hideLoadingScreen();
        this.renderCurrentLocation();
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
                <div style="display:flex; gap:10px; margin-top:20px;">
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
                    <select id="regClass">${PLAYER_CLASSES.map(v => `<option value="${v}">${v}</option>`).join('')}</select>
                </div>
                <div class="form-group">
                    <label for="regGender">Пол:</label>
                    <select id="regGender">${PLAYER_GENDERS.map(v => `<option value="${v}">${v}</option>`).join('')}</select>
                </div>
                <div style="display:flex; gap:10px; margin-top:20px;">
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
            showNotification('Введите имя пользователя и пароль', 'error');
            return;
        }
        if (password.length < 3) {
            showNotification('Пароль должен быть не менее 3 символов', 'error');
            return;
        }

        const db = this.loadPlayersDB();
        if (db.players[username]) {
            showNotification('Пользователь с таким именем уже существует', 'error');
            return;
        }

        this.currentUser = new Player(username, playerClass, gender);
        this.currentUser.location = 'Главная';

        const userData = this.currentUser.toDict();
        userData.passwordHash = hashPassword(password);

        db.players[username] = userData;
        db.metadata.totalPlayers = Object.keys(db.players).length;
        db.metadata.lastUpdate = formatDate();

        saveToStorage('playersDB', db);
        saveToStorage('currentUser', userData);

        this.currentLocation = 'Главная';
        showNotification(`Регистрация успешна! Добро пожаловать, ${username}!`, 'success');
        this.showMainGame();
    }

    handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            showNotification('Введите имя пользователя и пароль', 'error');
            return;
        }

        const db = this.loadPlayersDB();
        const userData = db.players[username];
        if (!userData) {
            showNotification('Пользователь не найден', 'error');
            return;
        }

        if (userData.metadata?.isBanned) {
            showNotification(`Аккаунт заблокирован: ${userData.metadata.banReason}`, 'error');
            return;
        }

        if (userData.passwordHash && userData.passwordHash !== hashPassword(password)) {
            showNotification('Неверный пароль', 'error');
            return;
        }

        this.currentUser = Player.fromDict(userData);
        this.currentUser.metadata.lastLogin = formatDate();
        this.currentLocation = this.currentUser.location || 'Главная';

        this.syncCurrentUser();
        showNotification(`Добро пожаловать, ${username}!`, 'success');
        this.showMainGame();
    }

    renderCurrentLocation() {
        const locationConfig = this.config.locations[this.currentLocation];
        if (!locationConfig) {
            showNotification(`Локация ${this.currentLocation} не найдена`, 'error');
            return;
        }

        this.gameContainer.innerHTML = '';

        const locationDiv = document.createElement('div');
        locationDiv.className = 'game-location active game-layout';
        locationDiv.style.backgroundColor = locationConfig.bgColor;
        locationDiv.style.color = locationConfig.fgColor;

        const title = document.createElement('div');
        title.className = 'location-title';
        title.textContent = locationConfig.title;
        locationDiv.appendChild(title);

        locationDiv.appendChild(this.renderToolbar());

        const contentGrid = document.createElement('div');
        contentGrid.className = 'location-grid';

        const leftPanel = document.createElement('section');
        leftPanel.className = 'location-panel';
        leftPanel.appendChild(this.renderLocationButtons(locationConfig));

        const centerPanel = document.createElement('section');
        centerPanel.className = 'location-panel location-panel-center';

        this.syncMonsterForLocation(locationConfig);
        if (this.currentMonster?.isAlive) {
            this.renderMonster(centerPanel);
        } else {
            centerPanel.innerHTML = '<div class="monster-empty">В этой зоне монстров сейчас нет.</div>';
        }

        const rightPanel = document.createElement('section');
        rightPanel.className = 'location-panel';
        rightPanel.appendChild(this.renderPlayerStats());

        contentGrid.appendChild(leftPanel);
        contentGrid.appendChild(centerPanel);
        contentGrid.appendChild(rightPanel);
        locationDiv.appendChild(contentGrid);

        if (locationConfig.lootPile?.visible) {
            const lootSection = document.createElement('section');
            lootSection.className = 'location-loot-row';
            this.renderLootPile(lootSection, locationConfig.lootPile);
            locationDiv.appendChild(lootSection);
        }

        this.gameContainer.appendChild(locationDiv);
    }

    renderToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'top-toolbar';
        toolbar.innerHTML = `
            <button class="btn btn-info" onclick="app.showInventory()">🎒 Сумка</button>
            <button class="btn btn-warning" onclick="app.showCharacterInfo()">👤 Профиль</button>
            <button class="btn btn-secondary" onclick="app.logout()">🚪 Выход</button>
        `;
        return toolbar;
    }

    renderLocationButtons(locationConfig) {
        const wrap = document.createElement('div');
        wrap.className = 'location-buttons vertical';

        for (const key of Object.keys(locationConfig)) {
            if (!key.startsWith('btn')) continue;
            const cfg = locationConfig[key];

            const button = document.createElement('button');
            button.className = 'location-btn';
            button.textContent = cfg.text;
            button.style.backgroundColor = cfg.bg;
            button.style.color = cfg.fg;

            if (cfg.isTransition && cfg.targetLocation) {
                button.onclick = () => this.goToLocation(cfg.targetLocation);
            } else {
                button.onclick = () => this.handleLocationAction(key, cfg);
            }

            wrap.appendChild(button);
        }

        return wrap;
    }

    renderPlayerStats() {
        const statsDiv = document.createElement('div');
        statsDiv.className = 'player-stats static-card';

        const hpPercent = Math.max(0, Math.min(100, (this.currentUser.hp / this.currentUser.hpMax) * 100));
        const mpPercent = Math.max(0, Math.min(100, (this.currentUser.mp / this.currentUser.mpMax) * 100));

        statsDiv.innerHTML = `
            <h3>${this.currentUser.username}</h3>
            <div class="player-stat"><span>Класс:</span><span>${this.currentUser.class}</span></div>
            <div class="player-stat"><span>Уровень:</span><span>${this.currentUser.level}</span></div>
            <div class="player-stat"><span>Опыт:</span><span>${this.currentUser.experience}/${expForNextLevel(this.currentUser.level)}</span></div>
            <div class="player-stat"><span>HP:</span><span>${this.currentUser.hp}/${this.currentUser.hpMax}</span></div>
            <div class="player-hp-bar"><div class="player-hp-fill" style="width:${hpPercent}%"></div></div>
            <div class="player-stat"><span>MP:</span><span>${this.currentUser.mp}/${this.currentUser.mpMax}</span></div>
            <div class="player-mp-bar"><div class="player-mp-fill" style="width:${mpPercent}%"></div></div>
            <div class="player-stat"><span>Атака:</span><span>${this.currentUser.minDmg}-${this.currentUser.maxDmg}</span></div>
            <div class="player-stat"><span>Защита:</span><span>${this.currentUser.defense}</span></div>
        `;
        return statsDiv;
    }

    syncMonsterForLocation(locationConfig) {
        if (!locationConfig.monster) {
            this.currentMonster = null;
            return;
        }
        if (this.currentMonster?.isAlive) return;

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

        this.currentMonster.addLootItem(new LootItem('healing_potion', 'Малое', [0, 0], [0, 0], [0.5, 1], 55, 'Обычный', 'heal', [18, 30]));
        this.currentMonster.addLootItem(new LootItem('mana_potion', 'Искрящаяся', [0, 0], [0, 0], [0.5, 1], 35, 'Обычный', 'mana', [12, 25]));
        this.currentMonster.addLootItem(new LootItem('wolf_fang', 'Острый', [2, 5], [0, 0], [0.8, 1.5], 25, 'Редкий'));
    }

    renderMonster(container) {
        const frame = document.createElement('div');
        frame.className = 'monster-frame monster-card';
        frame.style.left = 'unset';
        frame.style.top = 'unset';
        frame.innerHTML = `
            <div class="monster-icon">${this.currentMonster.icon}</div>
            <div class="monster-name">${this.currentMonster.name}</div>
            <div class="monster-stats">HP: ${this.currentMonster.hp}/${this.currentMonster.hpMax}</div>
            <div class="monster-stats">Атака: ${this.currentMonster.minDmg}-${this.currentMonster.maxDmg}</div>
            <button class="btn btn-danger" onclick="app.startBattle()">Сражаться</button>
        `;
        container.appendChild(frame);
    }

    renderLootPile(container, lootPileConfig) {
        const loot = document.createElement('div');
        loot.className = 'loot-pile static-card';
        loot.style.left = 'unset';
        loot.style.top = 'unset';
        loot.style.width = '100%';
        loot.style.height = 'auto';
        loot.style.backgroundColor = lootPileConfig.bgColor;
        loot.style.color = lootPileConfig.fgColor;

        const items = lootPileConfig.items.length
            ? lootPileConfig.items.map(item => `
                <button class="loot-item" title="${item.name}" onclick="app.pickupItem('${item.id}')">${item.icon}</button>
              `).join('')
            : '<div style="color:white;font-size:12px;">Пусто</div>';

        loot.innerHTML = `
            <div class="loot-header">
                <div class="loot-title">📦 Сундук локации</div>
                <button class="btn btn-warning" onclick="app.openChest()">Открыть</button>
            </div>
            <div class="loot-items">${items}</div>
        `;

        container.appendChild(loot);
    }

    handleLocationAction(btnKey, btnConfig) {
        if (btnKey.toLowerCase().includes('chest')) {
            this.openChest();
            return;
        }
        showNotification(`Действие ${btnConfig.text} пока не реализовано`, 'warning');
    }

    openChest() {
        const pile = this.config.locations[this.currentLocation].lootPile;
        if (!pile.items.length) {
            pile.items.push(this.createChestItem());
            if (Math.random() > 0.4) pile.items.push(this.createChestItem());
            showNotification('Вы открыли сундук и нашли предметы!', 'loot');
        } else {
            showNotification('В сундуке уже есть добыча.', 'info');
        }
        this.renderCurrentLocation();
    }

    createChestItem() {
        const list = Object.values(RPGApp.loadStaticItems());
        const base = list[getRandomInt(0, list.length - 1)];
        const id = generateId('loot');

        if (base.type === 'consumable') return { ...base, id, value: getRandomInt(18, 40) };
        if (base.type === 'weapon') return { ...base, id, damage: getRandomInt(2, 7) };
        if (base.type === 'armor') return { ...base, id, defense: getRandomInt(1, 5) };
        return { ...base, id };
    }

    pickupItem(itemId) {
        const pile = this.config.locations[this.currentLocation].lootPile;
        const index = pile.items.findIndex(item => item.id === itemId);
        if (index === -1) {
            showNotification('Предмет уже подобран', 'warning');
            return;
        }

        const item = pile.items[index];
        if (!this.currentUser.canCarryItem(item)) {
            showNotification('Слишком тяжелый предмет для сумки', 'warning');
            return;
        }

        this.currentUser.addItem(item);
        pile.items.splice(index, 1);
        this.syncCurrentUser();
        showNotification(`Подобрано: ${item.icon} ${item.name}`, 'success');
        this.renderCurrentLocation();
    }

    goToLocation(locationName) {
        if (this.currentMonster?.isAlive) {
            showNotification('Сначала победите монстра!', 'warning');
            return;
        }

        this.currentLocation = locationName;
        this.currentUser.location = locationName;
        this.syncCurrentUser();
        this.renderCurrentLocation();
    }

    startBattle() {
        if (!this.currentMonster?.isAlive) return;

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
        const potion = this.currentUser.inventory.find(item => item.type === 'consumable');
        if (!potion) {
            showNotification('Нет расходников в сумке', 'warning');
            return;
        }

        this.currentUser.useConsumable(potion);
        this.syncCurrentUser();
        this.updateBattleScreen();
        showNotification(`Использован предмет: ${potion.name}`, 'success');
    }

    monsterAttack() {
        if (!this.currentMonster?.isAlive) return this.renderCurrentLocation();

        const rawDamage = this.currentMonster.attack();
        const damage = this.currentUser.battleState.defenseActive ? Math.floor(rawDamage / 2) : rawDamage;
        const result = this.currentUser.takeDamage(damage);
        showNotification(`Монстр нанес ${damage} урона`, 'info');

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
            const level = this.currentUser.addExperience(expReward);
            this.addLootToCurrentLocation(loot);
            this.syncCurrentUser();
            this.showBattleResult(true, this.currentMonster.name, expReward, loot, level.levelsGained || 0);
        } else {
            this.currentUser.restoreHealthAndMana();
            this.syncCurrentUser();
            this.showBattleResult(false, this.currentMonster.name, 0, [], 0);
        }

        this.currentMonster = null;
        this.renderCurrentLocation();
    }

    showBattleResult(victory, monsterName, expReward, lootItems = [], levelsGained = 0) {
        let message = victory
            ? `ПОБЕДА! Вы победили ${monsterName}!<br>Получено опыта: ${expReward}`
            : `ПОРАЖЕНИЕ! Вас победил ${monsterName}.`;

        if (levelsGained > 0) message += `<br>🏆 Повышение уровня: +${levelsGained}`;
        if (lootItems.length > 0) message += '<br>Лут добавлен в сундук текущей локации.';

        showNotification(message, victory ? 'victory' : 'error', 4500);
    }

    updateBattleScreen() {
        const playerHp = document.getElementById('player-hp');
        const playerMp = document.getElementById('player-mp');
        const monsterHp = document.getElementById('monster-hp');

        if (playerHp) playerHp.textContent = this.currentUser.hp;
        if (playerMp) playerMp.textContent = this.currentUser.mp;
        if (monsterHp && this.currentMonster) monsterHp.textContent = this.currentMonster.hp;
    }

    addLootToCurrentLocation(items) {
        const pile = this.config.locations[this.currentLocation].lootPile;
        for (const item of items) pile.items.push(item);
    }

    showInventory() {
        const inventory = this.currentUser.inventory;
        const itemsMarkup = inventory.length ? inventory.map(item => {
            return `
            <div class="inv-item-row">
                <div class="inv-item-main">
                    <span class="inv-icon">${item.icon || '📦'}</span>
                    <div>
                        <div class="inv-name">${item.name}</div>
                        <div class="inv-meta">${this.getItemDescription(item)}</div>
                    </div>
                </div>
                <div class="inv-actions">
                    <button class="btn btn-info" onclick="app.inventoryAction('use','${item.id}')">Исп.</button>
                    <button class="btn btn-warning" onclick="app.inventoryAction('equip','${item.id}')">Надеть</button>
                    <button class="btn btn-danger" onclick="app.inventoryAction('drop','${item.id}')">Бросить</button>
                </div>
            </div>`;
        }).join('') : '<p>Сумка пуста.</p>';

        const content = `
            <div class="inventory-panel">
                <div class="inventory-summary">
                    <div>🎒 Вес: ${this.currentUser.getCurrentInventoryWeight().toFixed(1)} / ${this.currentUser.getMaxInventoryWeight()}</div>
                    <div>⚔️ Оружие: ${this.currentUser.equippedItems.weapon?.name || 'не экипировано'}</div>
                    <div>🛡️ Броня: ${this.currentUser.equippedItems.armor?.name || 'не экипировано'}</div>
                </div>
                <div class="inventory-list">${itemsMarkup}</div>
            </div>
        `;

        showModal(content, 'Интерфейс сумки');
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
            const req = this.currentUser.checkItemRequirements(item);
            if (!req.allowed) {
                showNotification(req.reason, 'warning');
                return;
            }
            const success = this.currentUser.equipItem(itemId);
            showNotification(success ? `Экипировано: ${item.name}` : 'Этот предмет нельзя экипировать', success ? 'success' : 'warning');
        } else if (action === 'drop') {
            const dropped = this.currentUser.removeItem(itemId);
            this.config.locations[this.currentLocation].lootPile.items.push(dropped);
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
            <div class="profile-panel">
                <div class="profile-head">
                    <h3>${p.username}</h3>
                    <div>${p.class} • ${p.gender}</div>
                </div>
                <div class="profile-grid">
                    <div class="profile-card">
                        <div><strong>Уровень:</strong> ${p.level}</div>
                        <div><strong>Опыт:</strong> ${p.experience}/${expForNextLevel(p.level)}</div>
                        <div><strong>Атака:</strong> ${p.minDmg}-${p.maxDmg}</div>
                        <div><strong>Защита:</strong> ${p.defense}</div>
                    </div>
                    <div class="profile-card">
                        <div><strong>HP/MP:</strong> ${p.hp}/${p.hpMax} • ${p.mp}/${p.mpMax}</div>
                        <div><strong>Сила:</strong> ${p.stats.strength}</div>
                        <div><strong>Ловкость:</strong> ${p.stats.agility}</div>
                        <div><strong>Интеллект:</strong> ${p.stats.intelligence}</div>
                        <div><strong>Выносливость:</strong> ${p.stats.vitality}</div>
                    </div>
                    <div class="profile-card equipment-card">
                        <h4>Экипировка</h4>
                        <div class="equip-row">
                            <span>⚔️ ${p.equippedItems.weapon?.name || 'Оружие не надето'}</span>
                            <button class="btn btn-secondary" onclick="app.unequipSlot('weapon')">Снять</button>
                        </div>
                        <div class="equip-row">
                            <span>🛡️ ${p.equippedItems.armor?.name || 'Броня не надета'}</span>
                            <button class="btn btn-secondary" onclick="app.unequipSlot('armor')">Снять</button>
                        </div>
                    </div>
                </div>
                <div class="profile-foot">Последний вход: ${new Date(p.metadata.lastLogin).toLocaleString('ru-RU')}</div>
            </div>
        `;

        showModal(content, 'Профиль игрока');
    }

    unequipSlot(slot) {
        const ok = this.currentUser.unequipItem(slot);
        if (!ok) {
            showNotification('Слот уже пуст', 'warning');
            return;
        }
        this.syncCurrentUser();
        closeModal();
        this.showCharacterInfo();
        this.renderCurrentLocation();
        showNotification('Предмет снят и перемещён в сумку', 'success');
    }

    getItemDescription(item) {
        if (item.type === 'weapon') return `Оружие • Урон +${item.damage || 0}`;
        if (item.type === 'armor') return `Броня • Защита +${item.defense || 0}`;
        if (item.type === 'consumable') return `Расходник • ${item.effect === 'mana' ? 'Мана' : 'HP'} +${item.value || 0}`;
        return 'Предмет';
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

        const db = this.loadPlayersDB();
        const old = db.players[this.currentUser.username] || {};
        const updated = { ...this.currentUser.toDict(), passwordHash: old.passwordHash || '' };

        db.players[this.currentUser.username] = updated;
        db.metadata.lastUpdate = formatDate();
        db.metadata.totalPlayers = Object.keys(db.players).length;

        saveToStorage('playersDB', db);
        saveToStorage('currentUser', updated);
    }

    ensureDefaultLoot() {
        for (const loc of Object.values(this.config.locations)) {
            if (!Array.isArray(loc.lootPile.items)) loc.lootPile.items = [];
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
