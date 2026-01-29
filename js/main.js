/**
 * Основной файл приложения - связывает все компоненты
 * Адаптирован под новую структуру с маршрутизацией
 */

class OfficeMapEditor {
    constructor() {
        this.mapCore = null;
        this.dataManager = null;
        this.roomsEditor = null;
        this.routingEditor = null;
        this.webExporter = null;
        
        this.init();
    }

    /**
     * Инициализация приложения
     */
    init() {
        console.log('=== ИНИЦИАЛИЗАЦИЯ РЕДАКТОРА КАРТЫ ОФИСА ===');
        
        try {
            // Инициализируем менеджер данных
            this.dataManager = new DataManager();
            console.log('DataManager инициализирован');
            
            // Инициализируем карту
            this.mapCore = new MapCore();
            
            // Инициализируем карту через промис
            this.mapCore.init('map', 'img/plan.png')
                .then((mapSuccess) => {
                    if (!mapSuccess) {
                        throw new Error('Не удалось инициализировать карту');
                    }

                    console.log('Карта успешно инициализирована');
                    
                    // Проверяем, есть ли файлы редакторов
                    if (typeof PolygonsEditor !== 'undefined') {
                        this.roomsEditor = new PolygonsEditor(this.mapCore, this.dataManager);
                        console.log('PolygonsEditor инициализирован');
                    } else {
                        console.warn('PolygonsEditor не найден');
                    }
                    
                    // Инициализируем редактор маршрутов
                    if (typeof RoutingEditor !== 'undefined') {
                        this.routingEditor = new RoutingEditor(this.mapCore, this.dataManager);
                        console.log('RoutingEditor инициализирован');
                        
                        // Отладочная информация
                        console.log('Методы RoutingEditor:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.routingEditor)));
                    } else {
                        console.warn('RoutingEditor не найден');
                    }
                    
                    // Инициализируем экспортер
                    if (typeof WebExporter !== 'undefined') {
                        this.webExporter = new WebExporter(this.dataManager);
                        console.log('WebExporter инициализирован');
                    } else {
                        console.warn('WebExporter не найден');
                    }
                    
                    // Загружаем объекты на карту
                    this.loadObjectsToMap();
                    
                    // Инициализируем вкладки
                    this.initTabs();
                    
                    // Инициализируем экспорт
                    this.initExport();
                    
                    // Обновляем статистику
                    this.updateStats();
                    
                    // Устанавливаем автосохранение
                    this.setupAutoSave();
                    
                    // Обновляем статус
                    this.updateStatus('Система загружена и готова к работе');
                    
                    console.log('=== СИСТЕМА УСПЕШНО ИНИЦИАЛИЗИРОВАНА ===');
                    
                })
                .catch((error) => {
                    console.error('Ошибка инициализации карты:', error);
                    
                    // Показываем подробную ошибку
                    let errorMessage = 'Ошибка загрузки карты. Проверьте:';
                    errorMessage += '\n1. Файл img/plan.png существует в папке img/';
                    errorMessage += '\n2. Файл доступен для чтения';
                    errorMessage += '\n3. Консоль для подробной информации';
                    
                    Utils.showNotification(errorMessage, 'error');
                    
                    // Показываем сообщение в интерфейсе
                    this.updateStatus('Ошибка загрузки карты. Проверьте консоль.');
                    
                    // Создаем тестовое изображение если файл не найден
                    if (error.message.includes('plan.png') || error.message.includes('404')) {
                        console.log('Попытка создать тестовое изображение...');
                        this.createTestBackground();
                    }
                });
            
        } catch (error) {
            console.error('Критическая ошибка инициализации:', error);
            Utils.showNotification('Критическая ошибка инициализации системы: ' + error.message, 'error');
        }
    }

    /**
     * Создание тестового фона если изображение не найдено
     */
    createTestBackground() {
        try {
            // Создаем простую подложку для тестирования
            const canvas = document.createElement('canvas');
            canvas.width = 1920;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d');
            
            // Заполняем фон
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, 1920, 1080);
            
            // Добавляем сетку
            ctx.strokeStyle = '#d0d0d0';
            ctx.lineWidth = 1;
            
            // Вертикальные линии
            for (let x = 0; x <= 1920; x += 100) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, 1080);
                ctx.stroke();
            }
            
            // Горизонтальные линии
            for (let y = 0; y <= 1080; y += 100) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(1920, y);
                ctx.stroke();
            }
            
            // Добавляем текст
            ctx.fillStyle = '#3498db';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('ОФИСНЫЙ ПЛАН', 960, 200);
            
            ctx.fillStyle = '#666';
            ctx.font = '24px Arial';
            ctx.fillText('Тестовая подложка (1920x1080)', 960, 250);
            ctx.fillText('Добавьте файл img/plan.png для использования реального плана', 960, 300);
            
            // Добавляем координаты
            ctx.fillStyle = '#888';
            ctx.font = '16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('Y: 0-1080', 50, 100);
            ctx.fillText('X: 0-1920', 50, 130);
            
            // Конвертируем в data URL
            const dataURL = canvas.toDataURL('image/png');
            
            // Обновляем изображение на карте
            if (this.mapCore && this.mapCore.imageOverlay) {
                this.mapCore.imageOverlay.setUrl(dataURL);
                Utils.showNotification('Создана тестовая подложка. Добавьте img/plan.png для реального плана.', 'warning');
            }
            
        } catch (error) {
            console.error('Ошибка создания тестового фона:', error);
        }
    }

    /**
     * Загрузка объектов на карту
     */
    loadObjectsToMap() {
        const data = this.dataManager.getData();
        console.log('Загрузка объектов на карту:', {
            rooms: data.rooms ? data.rooms.length : 0,
            points: data.points ? data.points.length : 0,
            routes: data.routes ? data.routes.length : 0,
            routePoints: data.routePoints ? data.routePoints.length : 0
        });
        
        // Загрузка выполняется каждым редактором отдельно при их инициализации
    }

    /**
     * Инициализация вкладок
     */
    initTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                
                // Убираем активный класс у всех вкладок
                tabs.forEach((t) => {
                    t.classList.remove('active');
                });
                
                document.querySelectorAll('.tab-content').forEach((content) => {
                    content.classList.remove('active');
                });

                // Добавляем активный класс выбранной вкладке
                tab.classList.add('active');
                const tabContent = document.getElementById(tabName + '-tab');
                if (tabContent) {
                    tabContent.classList.add('active');
                }
                
                // Сбрасываем режим рисования при переключении вкладок
                if (this.mapCore) {
                    this.mapCore.resetDrawingMode();
                }
                
                // Специальные действия для вкладок
                if (tabName === 'routes' && this.routingEditor) {
                    // Обновляем селекты при переходе на вкладку маршрутов
                    this.updateRoutingUI();
                } else if (tabName === 'export' && this.webExporter) {
                    this.updateStats();
                }
                
                this.updateStatus('Вкладка: ' + tab.textContent.trim());
            });
        });
    }

    /**
     * Обновление UI маршрутизации
     */
    updateRoutingUI() {
        try {
            // Обновляем селект кабинетов
            if (this.routingEditor && typeof this.routingEditor.updateRoomSelect === 'function') {
                this.routingEditor.updateRoomSelect();
            } else {
                // Альтернативный способ обновления селекта
                this.updateRoomSelectManually();
            }
            
            // Обновляем тестовые селекты
            if (this.routingEditor && typeof this.routingEditor.updateTestSelects === 'function') {
                this.routingEditor.updateTestSelects();
            }
        } catch (error) {
            console.warn('Ошибка обновления UI маршрутизации:', error);
        }
    }

    /**
     * Ручное обновление селекта кабинетов
     */
    updateRoomSelectManually() {
        const roomSelect = document.getElementById('room-select');
        if (!roomSelect) return;
        
        roomSelect.innerHTML = '<option value="">Выберите кабинет</option>';
        
        const rooms = this.dataManager.getAllPolygons();
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.id;
            option.textContent = room.name;
            roomSelect.appendChild(option);
        });
        
        console.log('Селект кабинетов обновлен вручную:', rooms.length, 'кабинетов');
    }

    /**
     * Инициализация экспорта
     */
    initExport() {
        console.log('Инициализация модуля экспорта...');
        
        // Кнопка экспорта веб-интерфейса
        const exportWebBtn = document.getElementById('export-web-btn');
        if (exportWebBtn) {
            exportWebBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.exportWebInterface();
            });
        }
        
        // Кнопка предпросмотра
        const previewWebBtn = document.getElementById('preview-web-btn');
        if (previewWebBtn) {
            previewWebBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.previewWebInterface();
            });
        }
        
        // Кнопка тестирования маршрута
        const testRouteBtn = document.getElementById('test-route-btn');
        if (testRouteBtn) {
            testRouteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.testRandomRoute();
            });
        }
    }

    /**
     * Экспорт веб-интерфейса
     */
    exportWebInterface() {
        if (!this.webExporter) {
            Utils.showNotification('Экспортер не инициализирован', 'error');
            return;
        }
        
        // Получаем текущие данные
        const data = this.dataManager.getData();
        
        // Получаем настройки из формы
        const options = {
            title: document.getElementById('webmap-title') ? document.getElementById('webmap-title').value : 'Карта офиса',
            description: document.getElementById('webmap-description') ? document.getElementById('webmap-description').value : 'Интерактивная карта офиса',
            theme: document.getElementById('webmap-theme') ? document.getElementById('webmap-theme').value : 'light',
            features: {
                search: document.getElementById('feature-search') ? document.getElementById('feature-search').checked !== false : true,
                routing: document.getElementById('feature-routing') ? document.getElementById('feature-routing').checked !== false : true,
                mobile: document.getElementById('feature-mobile') ? document.getElementById('feature-mobile').checked !== false : true
            },
            data: data,
            filename: 'office_map.html'
        };
        
        console.log('Экспорт веб-интерфейса с настройки:', options);
        
        try {
            const success = this.webExporter.exportWebInterface(options);
            if (success) {
                Utils.showNotification('Веб-интерфейс успешно экспортирован! Файл office_map.html загружен', 'success');
            }
        } catch (error) {
            console.error('Ошибка экспорта:', error);
            Utils.showNotification('Ошибка экспорта: ' + error.message, 'error');
        }
    }

    /**
     * Предпросмотр веб-интерфейса
     */
    previewWebInterface() {
        if (!this.webExporter) {
            Utils.showNotification('Экспортер не инициализирован', 'error');
            return;
        }
        
        // Получаем текущие данные
        const data = this.dataManager.getData();
        
        // Получаем настройки из формы
        const options = {
            title: document.getElementById('webmap-title') ? document.getElementById('webmap-title').value : 'Карта офиса',
            description: document.getElementById('webmap-description') ? document.getElementById('webmap-description').value : 'Интерактивная карта офиса',
            theme: document.getElementById('webmap-theme') ? document.getElementById('webmap-theme').value : 'light',
            features: {
                search: document.getElementById('feature-search') ? document.getElementById('feature-search').checked !== false : true,
                routing: document.getElementById('feature-routing') ? document.getElementById('feature-routing').checked !== false : true,
                mobile: document.getElementById('feature-mobile') ? document.getElementById('feature-mobile').checked !== false : true
            },
            data: data
        };
        
        try {
            const success = this.webExporter.previewWebInterface(options);
            if (success) {
                Utils.showNotification('Предпросмотр открыт в новом окне', 'info');
            }
        } catch (error) {
            console.error('Ошибка предпросмотра:', error);
            Utils.showNotification('Ошибка при открытии предпросмотра', 'error');
        }
    }

    /**
     * Тестирование случайного маршрута
     */
    testRandomRoute() {
        if (!this.routingEditor || !this.routingEditor.routingGraph) {
            Utils.showNotification('Редактор маршрутов не инициализирован', 'error');
            return;
        }
        
        const graph = this.routingEditor.routingGraph;
        const nodes = Array.from(graph.nodes.values()).filter(node => node.metadata?.isRoutingPoint !== false);
        
        if (nodes.length < 2) {
            Utils.showNotification('Нужно хотя бы 2 точки маршрутизации для теста', 'warning');
            return;
        }
        
        // Выбираем случайные точки
        const startNode = nodes[Math.floor(Math.random() * nodes.length)];
        let endNode;
        do {
            endNode = nodes[Math.floor(Math.random() * nodes.length)];
        } while (endNode.id === startNode.id);
        
        // Ищем путь
        const result = graph.findShortestPath(startNode.id, endNode.id);
        
        // Показываем результат
        const testResultDiv = document.getElementById('test-result');
        if (testResultDiv) {
            if (result.success) {
                testResultDiv.innerHTML = `
                    <h4 style="margin-top: 0; color: #2ecc71;">✅ Тест пройден успешно!</h4>
                    <p><strong>Маршрут:</strong> ${Utils.escapeHtml(startNode.name)} → ${Utils.escapeHtml(endNode.name)}</p>
                    <p><strong>Длина:</strong> ${result.length.toFixed(1)} ед.</p>
                    <p><strong>Точек в пути:</strong> ${result.nodes.length}</p>
                    <p><strong>Время поиска:</strong> ${result.searchTime.toFixed(1)} мс</p>
                    <p style="margin-top: 10px; font-size: 0.9em; color: #666;">
                        <i class="fas fa-info-circle"></i> Алгоритм работает корректно
                    </p>
                `;
            } else {
                testResultDiv.innerHTML = `
                    <h4 style="margin-top: 0; color: #e74c3c;">❌ Тест не пройден</h4>
                    <p><strong>Маршрут:</strong> ${Utils.escapeHtml(startNode.name)} → ${Utils.escapeHtml(endNode.name)}</p>
                    <p><strong>Причина:</strong> ${result.message || 'Путь не найден'}</p>
                    <p style="margin-top: 10px; font-size: 0.9em; color: #666;">
                        <i class="fas fa-info-circle"></i> Возможно, точки не соединены
                    </p>
                `;
            }
            testResultDiv.style.display = 'block';
        }
        
        // Визуализируем путь если найден
        if (result.success && this.routingEditor.routingVisual) {
            this.routingEditor.routingVisual.drawPath(result);
        }
        
        Utils.showNotification(`Тест маршрута: ${startNode.name} → ${endNode.name}`, 
                              result.success ? 'success' : 'warning');
    }

    /**
     * Обновление статистики
     */
    updateStats() {
        if (!this.dataManager) return;
        
        const stats = this.dataManager.getStats();
        
        // Обновляем элементы статистики
        const statsRooms = document.getElementById('stats-rooms');
        const statsPoints = document.getElementById('stats-points');
        const statsRoutes = document.getElementById('stats-connections');
        const statsTotal = document.getElementById('stats-total');
        
        if (statsRooms) statsRooms.textContent = stats.rooms;
        if (statsPoints) statsPoints.textContent = stats.points;
        if (statsRoutes) statsRoutes.textContent = stats.routes || 0;
        if (statsTotal) statsTotal.textContent = stats.total;
        
        // Дополнительная статистика для редактора маршрутов
        if (this.routingEditor && this.routingEditor.routingGraph) {
            const graphStats = this.routingEditor.routingGraph.getStats();
            if (statsPoints) statsPoints.textContent = graphStats.nodes || stats.points;
            if (statsRoutes) statsRoutes.textContent = graphStats.edges || stats.routes || 0;
            if (statsTotal) statsTotal.textContent = (stats.rooms + graphStats.nodes + graphStats.edges) || stats.total;
        }
    }

    /**
     * Настройка автосохранения
     */
    setupAutoSave() {
        // Автосохранение при изменении данных в dataManager
        const originalSaveData = this.dataManager.saveData.bind(this.dataManager);
        
        this.dataManager.saveData = function(...args) {
            const result = originalSaveData(...args);
            
            // Обновляем статистику после сохранения
            if (window.app) {
                window.app.updateStats();
            }
            
            return result;
        };
        
        // Автосохранение при закрытии страницы
        window.addEventListener('beforeunload', (event) => {
            try {
                // Быстрое сохранение перед закрытием
                this.dataManager.saveData();
            } catch (error) {
                console.warn('Не удалось сохранить данные перед закрытием:', error);
            }
        });
        
        // Периодическое автосохранение (каждые 30 секунд)
        setInterval(() => {
            if (this.dataManager) {
                this.dataManager.saveData();
                console.log('Автосохранение выполнено');
            }
        }, 30000);
    }

    /**
     * Обновление статуса
     * @param {string} message - Сообщение статуса
     */
    updateStatus(message) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    /**
     * Получение экземпляра редактора кабинетов
     * @returns {PolygonsEditor} Редактор кабинетов
     */
    getRoomsEditor() {
        return this.roomsEditor;
    }

    /**
     * Получение экземпляра редактора маршрутов
     * @returns {RoutingEditor} Редактор маршрутов
     */
    getRoutingEditor() {
        return this.routingEditor;
    }

    /**
     * Получение экземпляра экспортера
     * @returns {WebExporter} Экспортер
     */
    getWebExporter() {
        return this.webExporter;
    }

    /**
     * Получение всех данных
     * @returns {object} Все данные
     */
    getAllData() {
        return this.dataManager ? this.dataManager.getData() : null;
    }
}

/**
 * Отладочная функция для экспорта
 */
window.debugExport = function() {
    console.log('=== ОТЛАДОЧНЫЙ ЭКСПОРТ ===');
    
    if (window.app && window.app.webExporter) {
        const options = {
            title: 'Тестовая карта офиса',
            description: 'Тестовый экспорт для отладки',
            theme: 'light',
            features: {
                search: true,
                routing: true,
                mobile: true
            }
        };
        
        try {
            const html = window.app.webExporter.generateWebHTML(options);
            console.log('HTML успешно сгенерирован, размер:', html.length, 'символов');
            
            // Сохраняем в файл
            Utils.downloadFile(html, 'debug_export.html', 'text/html');
            
            Utils.showNotification('Отладочный экспорт завершен! Файл debug_export.html загружен', 'success');
            return true;
            
        } catch (error) {
            console.error('Ошибка отладочного экспорта:', error);
            Utils.showNotification('Ошибка отладочного экспорта: ' + error.message, 'error');
            return false;
        }
    } else {
        console.error('Экспортер не доступен. app:', window.app);
        Utils.showNotification('Экспортер не инициализирован', 'error');
        return false;
    }
};

/**
 * Отладочная функция для проверки данных
 */
window.debugData = function() {
    console.log('=== ОТЛАДОЧНЫЕ ДАННЫЕ ===');
    
    if (window.app && window.app.dataManager) {
        const data = window.app.getAllData();
        console.log('Все данные:', data);
        console.log('Статистика:', window.app.dataManager.getStats());
        
        // Сохраняем в localStorage для проверки
        localStorage.setItem('office_map_debug', JSON.stringify(data, null, 2));
        console.log('Данные сохранены в localStorage как office_map_debug');
        
        return data;
    } else {
        console.error('DataManager не доступен');
        return null;
    }
};

/**
 * Вспомогательная функция для тестирования
 */
window.testSystem = function() {
    console.log('=== ТЕСТИРОВАНИЕ СИСТЕМЫ ===');
    
    // Проверяем наличие всех компонентов
    const components = {
        'MapCore': window.app && window.app.mapCore,
        'DataManager': window.app && window.app.dataManager,
        'PolygonsEditor': window.app && window.app.roomsEditor,
        'RoutingEditor': window.app && window.app.routingEditor,
        'WebExporter': window.app && window.app.webExporter
    };
    
    console.log('Состояние компонентов:');
    Object.keys(components).forEach(function(name) {
        console.log('  ' + name + ': ' + (components[name] ? '✓' : '✗'));
    });
    
    // Проверяем данные
    if (window.app && window.app.dataManager) {
        const stats = window.app.dataManager.getStats();
        console.log('Статистика данных:', stats);
    }
    
    return components;
};

/**
 * Функция для перезагрузки подложки
 */
window.reloadBackground = function(imagePath) {
    if (window.app && window.app.mapCore) {
        const path = imagePath || 'img/plan.png';
        window.app.mapCore.reloadBackground(path);
    } else {
        Utils.showNotification('Карта не инициализирован', 'error');
    }
};

/**
 * Функция для проверки изображения
 */
window.checkImage = function() {
    const img = new Image();
    img.onload = function() {
        console.log('Изображение загружено успешно');
        console.log('Размеры:', img.width, 'x', img.height);
        Utils.showNotification('Изображение загружено: ' + img.width + 'x' + img.height, 'success');
    };
    img.onerror = function() {
        console.error('Не удалось загрузить изображение');
        Utils.showNotification('Ошибка загрузки изображения', 'error');
    };
    img.src = 'img/plan.png';
};

/**
 * Функция для создания тестового изображения
 */
window.createTestImage = function() {
    if (window.app && window.app.createTestBackground) {
        window.app.createTestBackground();
        Utils.showNotification('Тестовая подложка создана', 'success');
    }
};

/**
 * Проверка загрузки всех необходимых файлов
 */
window.checkFiles = function() {
    console.log('=== ПРОВЕРКА ФАЙЛОВ ===');
    
    const requiredFiles = [
        'js/core/utils.js',
        'js/core/map-core.js',
        'js/core/data-manager.js',
        'js/editors/polygons.js',
        'js/editors/routing-graph.js',
        'js/editors/routing-visual.js',
        'js/editors/routing-editor.js',
        'js/export/web-exporter.js',
        'js/main.js'
    ];
    
    let allLoaded = true;
    
    requiredFiles.forEach(file => {
        // Проверяем, загружен ли файл по наличию глобальных переменных
        let isLoaded = false;
        let error = '';
        
        switch(file) {
            case 'js/core/utils.js':
                isLoaded = typeof Utils !== 'undefined';
                if (!isLoaded) error = 'Utils не определен';
                break;
            case 'js/core/map-core.js':
                isLoaded = typeof MapCore !== 'undefined';
                if (!isLoaded) error = 'MapCore не определен';
                break;
            case 'js/core/data-manager.js':
                isLoaded = typeof DataManager !== 'undefined';
                if (!isLoaded) error = 'DataManager не определен';
                break;
            case 'js/editors/polygons.js':
                isLoaded = typeof PolygonsEditor !== 'undefined';
                if (!isLoaded) error = 'PolygonsEditor не определен';
                break;
            case 'js/editors/routing-graph.js':
                isLoaded = typeof RoutingGraph !== 'undefined';
                if (!isLoaded) error = 'RoutingGraph не определен';
                break;
            case 'js/editors/routing-visual.js':
                isLoaded = typeof RoutingVisual !== 'undefined';
                if (!isLoaded) error = 'RoutingVisual не определен';
                break;
            case 'js/editors/routing-editor.js':
                isLoaded = typeof RoutingEditor !== 'undefined';
                if (!isLoaded) error = 'RoutingEditor не определен';
                break;
            case 'js/export/web-exporter.js':
                isLoaded = typeof WebExporter !== 'undefined';
                if (!isLoaded) error = 'WebExporter не определен';
                break;
        }
        
        console.log(file + ': ' + (isLoaded ? '✓' : '✗ ' + error));
        
        if (!isLoaded) allLoaded = false;
    });
    
    console.log('Все файлы загружены: ' + (allLoaded ? 'ДА' : 'НЕТ'));
    return allLoaded;
};

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    try {
        window.app = new OfficeMapEditor();
        console.log('OfficeMapEditor инициализирован как window.app');
        
        // Делаем приложение доступным глобально для отладки
        window.OfficeMapEditor = OfficeMapEditor;
        
        // Показываем приветственное сообщение
        setTimeout(function() {
            Utils.showNotification('Редактор карты офиса успешно загружен!', 'success');
        }, 1000);
        
    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        Utils.showNotification('Критическая ошибка загрузки приложения: ' + error.message, 'error');
        
        // Показываем сообщение об ошибке в интерфейсе
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = 'Ошибка загрузки приложения';
            statusElement.style.color = '#e74c3c';
        }
    }
});

// Обработка ошибок глобально
window.addEventListener('error', function(event) {
    console.error('Глобальная ошибка:', event.error);
    Utils.showNotification('Произошла ошибка в приложении. Проверьте консоль.', 'error');
});

// Обработка обещаний без перехвата
window.addEventListener('unhandledrejection', function(event) {
    console.error('Необработанное обещание:', event.reason);
    Utils.showNotification('Необработанная ошибка в асинхронном коде', 'error');
});
