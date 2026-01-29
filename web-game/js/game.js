// Основной класс игры для Aldos RPG веб-версии

class RPGApp {
    constructor() {
        this.currentUser = null;
        this.currentLocation = "Главная";
        this.currentMonster = null;
        this.monsters = {};
        this.gameContainer = document.getElementById('game-container');
        this.loadingScreen = document.getElementById('loading-screen');
        this.modalOverlay = document.getElementById('modal-overlay');
        
        // Загружаем конфигурацию
        this.config = JSON.parse(JSON.stringify(CONFIG));
        
        // Инициализируем приложение
        this.init();
    }

    init() {
        // Проверяем, есть ли сохраненный пользователь
        const savedUser = loadFromStorage('currentUser');
        if (savedUser) {
            this.currentUser = Player.fromDict(savedUser);
            this.currentLocation = this.currentUser.location;
            this.showMainGame();
        } else {
            // Показываем экран входа/регистрации
            this.showAuthScreen();
        }
    }

    // Показать экран авторизации
    showAuthScreen() {
        this.hideLoadingScreen();
        const authContent = `
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
        
        this.gameContainer.innerHTML = authContent;
    }

    // Обработка входа
    handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (!username) {
            showNotification("Введите имя пользователя", "error");
            return;
        }
        
        if (!password) {
            showNotification("Введите пароль", "error");
            return;
        }
        
        // Загружаем базу данных игроков
        const playersDB = loadFromStorage('playersDB', { players: {}, metadata: {} });
        const userData = playersDB.players[username];
        
        if (!userData) {
            showNotification("Пользователь не найден", "error");
            return;
        }
        
        // Проверяем, заблокирован ли пользователь
        if (userData.metadata && userData.metadata.isBanned) {
            showNotification(`Аккаунт заблокирован: ${userData.metadata.banReason}`, "error");
            return;
        }
        
        // В целях безопасности в веб-версии просто проверяем существование
        // В реальной системе нужно бы сравнивать хэш пароля
        this.currentUser = Player.fromDict(userData);
        this.currentLocation = this.currentUser.location;
        
        // Обновляем время последнего входа
        this.currentUser.metadata.lastLogin = formatDate();
        saveToStorage('currentUser', this.currentUser.toDict());
        
        showNotification(`Добро пожаловать, ${username}!`, "success");
        this.showMainGame();
    }

    // Показать форму регистрации
    showRegisterForm() {
        const registerContent = `
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
        
        this.gameContainer.innerHTML = registerContent;
    }

    // Обработка регистрации
    handleRegister() {
        const username = document.getElementById('regUsername').value.trim();
        const password = document.getElementById('regPassword').value;
        const playerClass = document.getElementById('regClass').value;
        const gender = document.getElementById('regGender').value;
        
        if (!username) {
            showNotification("Введите имя пользователя", "error");
            return;
        }
        
        if (!password) {
            showNotification("Введите пароль", "error");
            return;
        }
        
        if (password.length < 3) {
            showNotification("Пароль должен быть не менее 3 символов", "error");
            return;
        }
        
        // Загружаем базу данных игроков
        const playersDB = loadFromStorage('playersDB', { players: {}, metadata: {} });
        
        // Проверяем, существует ли уже такой пользователь
        if (playersDB.players[username]) {
            showNotification("Пользователь с таким именем уже существует", "error");
            return;
        }
        
        // Создаем нового игрока
        this.currentUser = new Player(username, playerClass, gender);
        this.currentUser.location = "Главная";
        
        // Добавляем игрока в базу данных
        playersDB.players[username] = this.currentUser.toDict();
        playersDB.metadata.totalPlayers = Object.keys(playersDB.players).length;
        playersDB.metadata.lastUpdate = formatDate();
        
        // Сохраняем базу данных
        saveToStorage('playersDB', playersDB);
        
        // Сохраняем текущего пользователя
        saveToStorage('currentUser', this.currentUser.toDict());
        
        showNotification(`Регистрация успешна! Добро пожаловать, ${username}!`, "success");
        this.showMainGame();
    }

    // Показать основную игру
    showMainGame() {
        this.hideLoadingScreen();
        this.renderCurrentLocation();
    }

    // Скрыть экран загрузки
    hideLoadingScreen() {
        this.loadingScreen.classList.add('hidden');
    }

    // Показать экран загрузки
    showLoadingScreen() {
        this.loadingScreen.classList.remove('hidden');
    }

    // Отрендерить текущую локацию
    renderCurrentLocation() {
        const locationConfig = this.config.locations[this.currentLocation];
        if (!locationConfig) {
            console.error(`Конфигурация для локации "${this.currentLocation}" не найдена`);
            return;
        }

        // Очищаем контейнер
        this.gameContainer.innerHTML = '';

        // Создаем контейнер локации
        const locationDiv = document.createElement('div');
        locationDiv.className = 'game-location active';
        locationDiv.style.backgroundColor = locationConfig.bgColor;
        locationDiv.style.color = locationConfig.fgColor;

        // Заголовок локации
        const titleDiv = document.createElement('div');
        titleDiv.className = 'location-title';
        titleDiv.textContent = locationConfig.title;
        locationDiv.appendChild(titleDiv);

        // Кнопки перехода
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'location-buttons';

        // Добавляем кнопки для данной локации
        for (const key in locationConfig) {
            if (key.startsWith('btn')) {
                const btnConfig = locationConfig[key];
                if (btnConfig.isTransition && btnConfig.targetLocation) {
                    const button = document.createElement('button');
                    button.className = 'location-btn';
                    button.textContent = btnConfig.text;
                    button.style.backgroundColor = btnConfig.bg;
                    button.style.color = btnConfig.fg;
                    button.style.fontFamily = btnConfig.fontFamily;
                    button.style.fontSize = btnConfig.fontSize + 'px';
                    button.style.fontWeight = btnConfig.bold ? 'bold' : 'normal';
                    button.style.width = btnConfig.width + 'px';
                    button.style.height = btnConfig.height + 'px';
                    
                    button.onclick = () => this.goToLocation(btnConfig.targetLocation);
                    buttonsContainer.appendChild(button);
                }
            }
        }

        locationDiv.appendChild(buttonsContainer);

        // Добавляем информацию об игроке
        this.renderPlayerStats(locationDiv);

        // Если в локации есть монстр, отображаем его
        if (locationConfig.monster && !this.currentMonster) {
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
        }

        // Отображаем монстра если он есть
        if (this.currentMonster && this.currentMonster.isAlive) {
            this.renderMonster(locationDiv);
        }

        // Отображаем сундук/лут
        if (locationConfig.lootPile && locationConfig.lootPile.visible) {
            this.renderLootPile(locationDiv, locationConfig.lootPile);
        }

        this.gameContainer.appendChild(locationDiv);
    }

    // Отрендерить статистику игрока
    renderPlayerStats(container) {
        const statsDiv = document.createElement('div');
        statsDiv.className = 'player-stats';
        statsDiv.innerHTML = `
            <div><strong>${this.currentUser.username}</strong></div>
            <div>Класс: ${this.currentUser.class}</div>
            <div>Уровень: ${this.currentUser.level}</div>
            <div>Опыт: ${this.currentUser.experience} / ${expForNextLevel(this.currentUser.level)}</div>
            <div>HP: ${this.currentUser.hp} / ${this.currentUser.hpMax}</div>
            <div>MP: ${this.currentUser.mp} / ${this.currentUser.mpMax}</div>
            <div>Атака: ${this.currentUser.minDmg}-${this.currentUser.maxDmg}</div>
            <div>Защита: ${this.currentUser.defense}</div>
        `;
        
        container.appendChild(statsDiv);
    }

    // Отрендерить монстра
    renderMonster(container) {
        const monsterFrame = document.createElement('div');
        monsterFrame.className = 'monster-frame';
        monsterFrame.style.left = this.currentMonster.x + 'px';
        monsterFrame.style.top = this.currentMonster.y + 'px';
        monsterFrame.id = 'monster-' + this.currentMonster.id;

        monsterFrame.innerHTML = `
            <div class="monster-icon">${this.currentMonster.icon}</div>
            <div class="monster-name">${this.currentMonster.name}</div>
            <div class="monster-stats">HP: ${this.currentMonster.hp}/${this.currentMonster.hpMax}</div>
            <div class="monster-stats">Атака: ${this.currentMonster.minDmg}-${this.currentMonster.maxDmg}</div>
            <button class="btn btn-danger" onclick="app.startBattle()" style="margin-top: 5px;">Сражаться</button>
        `;

        container.appendChild(monsterFrame);
    }

    // Отрендерить сундук/лут
    renderLootPile(container, lootPileConfig) {
        const lootPile = document.createElement('div');
        lootPile.className = 'loot-pile';
        lootPile.style.left = lootPileConfig.x + 'px';
        lootPile.style.top = lootPileConfig.y + 'px';
        lootPile.style.width = lootPileConfig.width + 'px';
        lootPile.style.height = lootPileConfig.height + 'px';
        lootPile.style.backgroundColor = lootPileConfig.bgColor;
        lootPile.style.color = lootPileConfig.fgColor;

        lootPile.innerHTML = `
            <div class="loot-title">📦 Сундук</div>
            <div class="loot-items">
                ${lootPileConfig.items && lootPileConfig.items.length > 0 
                    ? lootPileConfig.items.map(item => `
                        <div class="loot-item" title="${item.name}" onclick="app.pickupItem('${item.id}')">${item.icon}</div>
                      `).join('')
                    : '<div style="color: white; font-size: 12px;">Пусто</div>'
                }
            </div>
        `;

        container.appendChild(lootPile);
    }

    // Перейти в другую локацию
    goToLocation(locationName) {
        if (this.currentMonster && this.currentMonster.isAlive) {
            showNotification("Сначала победите монстра!", "warning");
            return;
        }
        
        this.currentLocation = locationName;
        this.currentUser.location = locationName;
        
        // Сохраняем прогресс
        saveToStorage('currentUser', this.currentUser.toDict());
        
        this.renderCurrentLocation();
    }

    // Начать бой
    startBattle() {
        if (!this.currentMonster || !this.currentMonster.isAlive) {
            return;
        }

        // Создаем экран боя
        const battleDiv = document.createElement('div');
        battleDiv.className = 'game-location active';
        battleDiv.setAttribute('data-location', 'battle');
        
        battleDiv.innerHTML = `
            <div class="battle-screen">
                <h2 class="battle-title">Бой с ${this.currentMonster.name}</h2>
                
                <div class="battle-characters">
                    <div class="battle-character battle-player">
                        <div class="battle-character-icon">👤</div>
                        <div class="battle-character-name">${this.currentUser.username}</div>
                        <div class="battle-character-stats">Уровень: ${this.currentUser.level}</div>
                        <div class="battle-character-stats">Класс: ${this.currentUser.class}</div>
                        <div class="battle-character-stats">HP: <span id="player-hp">${this.currentUser.hp}</span>/<span id="player-max-hp">${this.currentUser.hpMax}</span></div>
                        <div class="player-hp-bar"><div class="player-hp-fill" style="width: ${(this.currentUser.hp / this.currentUser.hpMax) * 100}%"></div></div>
                        <div class="battle-character-stats">MP: <span id="player-mp">${this.currentUser.mp}</span>/<span id="player-max-mp">${this.currentUser.mpMax}</span></div>
                        <div class="player-mp-bar"><div class="player-mp-fill" style="width: ${(this.currentUser.mp / this.currentUser.mpMax) * 100}%"></div></div>
                        <div class="battle-character-stats">Атака: ${this.currentUser.minDmg}-${this.currentUser.maxDmg}</div>
                        <div class="battle-character-stats">Защита: ${this.currentUser.defense}</div>
                    </div>
                    
                    <div class="battle-character battle-monster">
                        <div class="battle-character-icon">${this.currentMonster.icon}</div>
                        <div class="battle-character-name">${this.currentMonster.name}</div>
                        <div class="battle-character-stats">HP: <span id="monster-hp">${this.currentMonster.hp}</span>/<span id="monster-max-hp">${this.currentMonster.hpMax}</span></div>
                        <div class="battle-character-bar"><div class="battle-character-hp" style="width: ${(this.currentMonster.hp / this.currentMonster.hpMax) * 100}%"></div></div>
                        <div class="battle-character-stats">Атака: ${this.currentMonster.minDmg}-${this.currentMonster.maxDmg}</div>
                        <div class="battle-character-stats">EXP: ${this.currentMonster.expReward}</div>
                    </div>
                </div>
                
                <div class="battle-controls">
                    <button class="battle-btn attack" onclick="app.playerAttack()">⚔️ Атака</button>
                    <button class="battle-btn defense" onclick="app.useDefense()">🛡️ Защита</button>
                    <button class="battle-btn magic" onclick="app.useMagic()" id="magic-btn" style="display: ${this.currentUser.mp > 0 ? 'block' : 'none'};">🔮 Магия</button>
                    <button class="battle-btn item" onclick="app.useItem()">🧪 Предмет</button>
                    <button class="battle-btn escape" onclick="app.endBattle()">🚪 Бежать</button>
                </div>
            </div>
        `;

        this.gameContainer.innerHTML = '';
        this.gameContainer.appendChild(battleDiv);
    }

    // Атака игрока
    playerAttack() {
        if (!this.currentMonster || !this.currentMonster.isAlive) {
            this.renderCurrentLocation();
            return;
        }

        // Проверяем, не оглушен ли игрок
        if (this.currentUser.battleState.stunnedTurns > 0) {
            showNotification("Вы оглушены! Пропускаете ход.", "warning");
            this.currentUser.updateBattleState();
            this.monsterAttack();
            return;
        }

        // Атака игрока
        const playerDamage = this.currentUser.attack();
        const monsterAlive = this.currentMonster.takeDamage(playerDamage);

        showNotification(`Вы нанесли ${playerDamage} урона монстру!`, "info");

        if (!monsterAlive) {
            // Монстр побежден
            const expReward = this.currentMonster.expReward;
            const lootItems = this.currentMonster.generateLoot();
            
            const result = this.currentUser.addExperience(expReward);
            
            // Сохраняем прогресс
            saveToStorage('currentUser', this.currentUser.toDict());
            
            // Показываем результат боя
            this.showBattleResult(true, this.currentMonster.name, expReward, lootItems, result.levelsGained || 0);
            
            // Удаляем монстра
            this.currentMonster = null;
            return;
        }

        // Атака монстра в ответ
        this.monsterAttack();
    }

    // Атака монстра
    monsterAttack() {
        if (!this.currentMonster || !this.currentMonster.isAlive) {
            this.renderCurrentLocation();
            return;
        }

        // Проверяем, активна ли защита игрока
        if (this.currentUser.battleState.defenseActive) {
            // При активной защите получаем половину урона
            const rawDamage = this.currentMonster.attack();
            const damage = Math.floor(rawDamage / 2);
            const result = this.currentUser.takeDamage(damage);
            
            showNotification(`Монстр нанес ${rawDamage} урона, но вы защищались! Получено: ${damage} урона.`, "info");
        } else {
            const damage = this.currentMonster.attack();
            const result = this.currentUser.takeDamage(damage);
            
            showNotification(`Монстр нанес ${damage} урона!`, "info");
        }

        // Проверяем, жив ли игрок
        if (!result.alive) {
            // Игрок побежден
            showNotification(`Вы были побеждены монстром ${this.currentMonster.name}!`, "error");
            
            // Восстанавливаем игрока (в реальной игре можно добавить штраф)
            this.currentUser.restoreHealthAndMana();
            
            // Сохраняем прогресс
            saveToStorage('currentUser', this.currentUser.toDict());
            
            // Показываем результат поражения
            this.showBattleResult(false, this.currentMonster.name, 0, [], 0);
            
            // Удаляем монстра
            this.currentMonster = null;
            return;
        }

        // Обновляем состояние боя для игрока
        this.currentUser.updateBattleState();

        // Обновляем экран боя
        this.updateBattleScreen();
    }

    // Использовать защиту
    useDefense() {
        if (!this.currentMonster || !this.currentMonster.isAlive) {
            this.renderCurrentLocation();
            return;
        }

        // Активируем защиту
        this.currentUser.useDefense();
        showNotification("Вы принимаете оборонительную позицию!", "info");

        // Атака монстра в ответ
        this.monsterAttack();
    }

    // Закончить бой
    endBattle() {
        this.renderCurrentLocation();
    }

    // Обновить экран боя
    updateBattleScreen() {
        if (!this.currentMonster || !this.currentMonster.isAlive) {
            this.renderCurrentLocation();
            return;
        }

        // Находим элементы боя и обновляем их
        const battleScreen = this.gameContainer.querySelector('.game-location.active');
        if (!battleScreen) return;

        // Обновляем HP отображения
        const playerHpDisplay = battleScreen.querySelector('div:nth-child(2) div:nth-child(3)');
        const monsterHpDisplay = battleScreen.querySelector('div:nth-child(2) div:nth-child(6)');
        
        if (playerHpDisplay) {
            playerHpDisplay.textContent = `HP: ${this.currentUser.hp}/${this.currentUser.hpMax}`;
        }
        
        if (monsterHpDisplay) {
            monsterHpDisplay.textContent = `HP: ${this.currentMonster.hp}/${this.currentMonster.hpMax}`;
        }
    }

    // Показать результат боя
    showBattleResult(victory, monsterName, expReward, lootItems = [], levelsGained = 0) {
        let message = "";
        let type = "";

        if (victory) {
            message = `ПОБЕДА! Вы победили ${monsterName}!`;
            type = "victory";
        } else {
            message = `ПОРАЖЕНИЕ! Вас победил ${monsterName}.`;
            type = "error";
        }

        // Добавляем информацию об опыте
        message += `<br>Получено опыта: ${expReward}`;

        if (levelsGained > 0) {
            message += `<br>🏆 Повышение уровня! Теперь вы ${this.currentUser.level} уровня.`;
        }

        // Добавляем информацию о луте
        if (lootItems && lootItems.length > 0) {
            message += `<br>🎁 Вы получили: `;
            for (const item of lootItems) {
                message += `${item.icon} ${item.name}, `;
            }
            message = message.slice(0, -2); // Убираем последние ", "

            // Добавляем предметы в инвентарь
            for (const item of lootItems) {
                if (this.currentUser.canCarryItem(item)) {
                    this.currentUser.addItem(item);
                } else {
                    showNotification(`Слишком много предметов! ${item.name} потеряно.`, "warning");
                }
            }
        }

        // Сохраняем прогресс
        saveToStorage('currentUser', this.currentUser.toDict());

        // Показываем уведомление
        showNotification(message, type, 5000);
    }

    // Подобрать предмет
    pickupItem(itemId) {
        // В текущей реализации функция пока не полностью реализована
        // Но мы можем добавить базовую функциональность
        showNotification("Функция подбора предметов пока в разработке", "info");
    }

    // Загрузить статические предметы (заглушка)
    static loadStaticItems() {
        // В реальной версии это загружалось бы из внешнего файла
        return {};
    }
}