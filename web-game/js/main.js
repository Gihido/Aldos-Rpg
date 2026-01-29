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

// Запускаем игру когда страница загрузится
initializeGame();