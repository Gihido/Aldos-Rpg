// Утилиты для Aldos RPG веб-версии

// Генерация случайного числа в диапазоне
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Хэширование пароля (упрощенная версия для демонстрации)
function hashPassword(password) {
    // В реальном приложении используйте более безопасный алгоритм
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
}

// Сохранение данных в localStorage
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error("Ошибка сохранения в localStorage:", e);
        return false;
    }
}

// Загрузка данных из localStorage
function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
        console.error("Ошибка загрузки из localStorage:", e);
        return defaultValue;
    }
}

// Удаление данных из localStorage
function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        console.error("Ошибка удаления из localStorage:", e);
        return false;
    }
}

// Форматирование даты
function formatDate(date) {
    if (!date) date = new Date();
    return new Date(date).toISOString();
}

// Проверка, прошло ли определенное количество времени
function isTimePassed(timestamp, seconds) {
    const now = Date.now();
    const targetTime = new Date(timestamp).getTime() + (seconds * 1000);
    return now >= targetTime;
}

// Добавление уведомления
function showNotification(message, type = "info", duration = 3000) {
    // Удаляем старое уведомление если есть
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const style = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;
    notification.innerHTML = `
        <div style="display: flex; align-items: center;">
            <span style="font-size: 18px; margin-right: 8px;">${style.icon}</span>
            <span>${message}</span>
        </div>
    `;
    
    document.getElementById('game-container').appendChild(notification);

    // Автоматическое удаление через указанное время
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }

    return notification;
}

// Отображение модального окна
function showModal(content, title = "", onClose = null) {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('hidden');

    // Создаем содержимое модального окна
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-window';
    modalContent.innerHTML = `
        ${title ? `<div class="modal-header">${title}</div>` : ''}
        <div class="modal-content">${content}</div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Закрыть</button>
        </div>
    `;

    overlay.appendChild(modalContent);

    // Добавляем обработчик закрытия
    overlay.onclick = function(event) {
        if (event.target === overlay) {
            closeModal();
            if (onClose && typeof onClose === 'function') {
                onClose();
            }
        }
    };

    return modalContent;
}

// Закрытие модального окна
function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    
    // Удаляем все содержимое модального окна
    while (overlay.firstChild) {
        overlay.removeChild(overlay.firstChild);
    }
}

// Форматирование чисел с разделителями тысяч
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Вычисление уровня по опыту
function calculateLevel(exp) {
    // Простая формула: уровень = sqrt(опыт / 100) + 1
    return Math.floor(Math.sqrt(exp / 100)) + 1;
}

// Вычисление опыта, необходимого для следующего уровня
function expForNextLevel(currentLevel) {
    return currentLevel * currentLevel * 100;
}

// Генерация ID
function generateId(prefix = "obj") {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}