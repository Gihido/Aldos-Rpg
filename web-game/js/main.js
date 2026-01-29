// Главный файл запуска для Aldos RPG веб-версии

// Глобальная переменная для доступа к приложению
let app = null;

// Функция инициализации игры
function initializeGame() {
    // Ждем полной загрузки DOM
    document.addEventListener('DOMContentLoaded', function() {
        // Создаем экземпляр игры
        app = new RPGApp();
        
        console.log("Aldos RPG веб-версия успешно запущена!");
    });
}

// Глобальная функция для показа уведомлений
window.showNotification = function(message, type = 'info', duration = 3000) {
    // Удаляем существующие уведомления
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message.replace(/\n/g, '<br>');
    
    document.body.appendChild(notification);
    
    // Автоматически удаляем уведомление через указанное время
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, duration);
};

// Запускаем игру когда страница загрузится
initializeGame();