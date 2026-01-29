/**
 * Экспорт веб-интерфейса (исправленная версия)
 */

class WebExporter {
    constructor(dataManager) {
        this.dataManager = dataManager;
        console.log('WebExporter инициализирован');
    }

    /**
     * Получение базового шаблона HTML
     * @returns {string} HTML шаблон
     */
    getBaseTemplate() {
        return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{TITLE}</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        /* Основные стили */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
            color: #333;
            height: 100vh;
            overflow: hidden;
        }
        
        .container {
            display: flex;
            height: 100vh;
        }
        
        /* Панель карты */
        .map-panel {
            flex: 3;
            position: relative;
        }
        
        #map {
            width: 100%;
            height: 100%;
            background: #ddd;
        }
        
        /* Панель управления */
        .control-panel {
            flex: 1;
            min-width: 350px;
            background: white;
            border-left: 2px solid #ddd;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .panel-header {
            background: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
            border-bottom: 3px solid #3498db;
        }
        
        .panel-header h1 {
            font-size: 1.5em;
            margin-bottom: 10px;
        }
        
        /* Секции */
        .section {
            margin: 15px;
            padding: 15px;
            border: 1px solid #eee;
            border-radius: 8px;
            background: #f8f9fa;
        }
        
        .section h3 {
            margin-bottom: 15px;
            color: #2c3e50;
            border-bottom: 1px solid #ddd;
            padding-bottom: 8px;
        }
        
        /* Формы */
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: #555;
        }
        
        .form-control {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        select.form-control {
            padding: 10px;
            background-color: white;
        }
        
        /* Кнопки */
        .btn {
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .btn-primary {
            background: #3498db;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2980b9;
        }
        
        .btn-success {
            background: #2ecc71;
            color: white;
        }
        
        .btn-success:hover {
            background: #27ae60;
        }
        
        .btn-danger {
            background: #e74c3c;
            color: white;
        }
        
        .btn-block {
            width: 100%;
        }
        
        /* Результаты поиска */
        .results {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
        }
        
        .result-item {
            padding: 10px;
            border-bottom: 1px solid #eee;
            cursor: pointer;
        }
        
        .result-item:hover {
            background: #f0f0f0;
        }
        
        /* Маршрут */
        .route-info {
            background: #e8f4fc;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            display: none;
        }
        
        .route-info.active {
            display: block;
        }
        
        /* Статус */
        .status {
            padding: 10px;
            text-align: center;
            font-size: 0.9em;
            color: #666;
            background: #f8f9fa;
            border-top: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Панель карты -->
        <div class="map-panel">
            <div id="map"></div>
        </div>

        <!-- Панель управления -->
        <div class="control-panel">
            <div class="panel-header">
                <h1><i class="fas fa-map-marked-alt"></i> {TITLE}</h1>
                <div class="subtitle">{DESCRIPTION}</div>
            </div>

            <!-- Поиск -->
            <div class="section">
                <h3><i class="fas fa-search"></i> Поиск</h3>
                <div class="form-group">
                    <input type="text" id="search-input" class="form-control" placeholder="Поиск кабинетов и точек...">
                </div>
                <div class="results" id="search-results">
                    <!-- Результаты поиска -->
                </div>
            </div>

            <!-- Построение маршрута -->
            <div class="section">
                <h3><i class="fas fa-route"></i> Построение маршрута</h3>
                <div class="form-group">
                    <label>Откуда:</label>
                    <select id="from-select" class="form-control">
                        <option value="">Выберите точку</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Куда:</label>
                    <select id="to-select" class="form-control">
                        <option value="">Выберите точку</option>
                    </select>
                </div>
                <div class="form-group">
                    <button id="find-route-btn" class="btn btn-primary btn-block" disabled>
                        <i class="fas fa-route"></i> Найти маршрут
                    </button>
                </div>
                <div class="route-info" id="route-info">
                    <!-- Информация о маршруте -->
                </div>
            </div>

            <!-- Информация -->
            <div class="section">
                <h3><i class="fas fa-info-circle"></i> Информация</h3>
                <div id="stats-info">
                    Загрузка данных...
                </div>
            </div>

            <div class="status" id="status">
                Готов к работе
            </div>
        </div>
    </div>

    <!-- Подключаем Leaflet -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    
    <!-- Основной скрипт -->
    <script>
        // Данные карты
        const mapData = {DATA};
        
        // Инициализация
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Интерактивная карта загружается...');
            initializeMap();
            initializeControls();
            loadData();
        });
        
        // Инициализация карты
        function initializeMap() {
            // Создаем карту
            window.map = L.map('map', {
                crs: L.CRS.Simple,
                minZoom: -2,
                maxZoom: 2
            });
            
            // Устанавливаем границы
            const imageBounds = [[0, 0], [1080, 1920]];
            
            // Добавляем изображение плана
            L.imageOverlay('plan.png', imageBounds).addTo(window.map);
            
            // Центрируем карту
            window.map.fitBounds(imageBounds);
            window.map.setView([540, 960], 0);
        }
        
        // Инициализация элементов управления
        function initializeControls() {
            // TODO: реализовать элементы управления
            console.log('Элементы управления инициализированы');
        }
        
        // Загрузка данных
        function loadData() {
            // TODO: загрузить и отобразить данные из mapData
            console.log('Данные загружены:', mapData);
        }
    </script>
</body>
</html>`;
    }

    /**
     * Обновление статистики
     */
    updateStats() {
        const stats = this.dataManager.getStats();
        
        const statsRooms = document.getElementById('stats-rooms');
        const statsPoints = document.getElementById('stats-points');
        const statsRoutes = document.getElementById('stats-routes');
        const statsTotal = document.getElementById('stats-total');
        
        if (statsRooms) statsRooms.textContent = stats.rooms;
        if (statsPoints) statsPoints.textContent = stats.points;
        if (statsRoutes) statsRoutes.textContent = stats.routes;
        if (statsTotal) statsTotal.textContent = stats.total;
    }

    /**
     * Генерация HTML для веб-интерфейса
     * @param {object} options - Настройки экспорта
     * @returns {string} HTML код
     */
    generateWebHTML(options) {
        const data = this.dataManager.getData();
        
        const html = this.getBaseTemplate()
            .replace('{TITLE}', options.title || 'Интерактивная карта офиса')
            .replace('{DESCRIPTION}', options.description || 'Найдите кабинет или проложите маршрут')
            .replace('{DATA}', JSON.stringify(data, null, 2));
        
        return html;
    }

    /**
     * Экспорт веб-интерфейса
     * @param {object} options - Настройки экспорта
     * @returns {boolean} Успешно ли экспортировано
     */
    exportWebInterface(options) {
        try {
            const html = this.generateWebHTML(options);
            Utils.downloadFile(html, options.filename || 'office_map.html', 'text/html');
            return true;
        } catch (error) {
            console.error('Ошибка экспорта:', error);
            return false;
        }
    }

    /**
     * Предпросмотр веб-интерфейса
     * @param {object} options - Настройки экспорта
     * @returns {boolean} Успешно ли открыто
     */
    previewWebInterface(options) {
        try {
            const html = this.generateWebHTML(options);
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            return true;
        } catch (error) {
            console.error('Ошибка предпросмотра:', error);
            return false;
        }
    }
}

// Экспортируем класс для глобального использования
window.WebExporter = WebExporter;
