/**
 * Редактор маршрутов и точек входа - упрощенная рабочая версия
 */

class RoutingEditor {
    constructor(mapCore, dataManager) {
        this.mapCore = mapCore;
        this.dataManager = dataManager;
        this.routingGraph = new RoutingGraph(dataManager);
        this.routingVisual = new RoutingVisual(mapCore, this.routingGraph);
        
        this.currentMode = null; // 'entrance', 'point', 'connection'
        this.selectedPoints = [];
        this.mapClickHandler = null;
        
        this.init();
    }

    /**
     * Инициализация редактора
     */
    init() {
        console.log('Инициализация редактора маршрутизации...');
        this.initUI();
        this.updateRoomSelect();
        this.updateTestSelects();
        console.log('Редактор маршрутизации инициализирован');
    }

    /**
     * Инициализация UI
     */
    initUI() {
        console.log('Инициализация UI маршрутизации...');
        
        // === Секция 1.1: Точки входа в кабинеты ===
        const createEntranceBtn = document.getElementById('create-entrance-btn');
        if (createEntranceBtn) {
            createEntranceBtn.addEventListener('click', () => {
                this.startEntranceCreationMode();
            });
        }
        
        const roomSelect = document.getElementById('room-select');
        if (roomSelect) {
            roomSelect.addEventListener('change', (e) => {
                this.selectRoomForEntrance(e.target.value);
            });
        }
        
        // === Секция 1.2: Точки интереса ===
        const createPointBtn = document.getElementById('create-point-btn');
        if (createPointBtn) {
            createPointBtn.addEventListener('click', () => {
                this.startPointCreationMode();
            });
        }
        
        const pointNameInput = document.getElementById('point-name-input');
        if (pointNameInput) {
            pointNameInput.addEventListener('input', () => {
                this.updatePointCreationButton();
            });
        }
        
        const routingCheckbox = document.getElementById('routing-checkbox');
        if (routingCheckbox) {
            routingCheckbox.addEventListener('change', () => {
                this.updatePointCreationButton();
            });
        }
        
        // === Секция 3: Создание соединений ===
        const connectionModeBtn = document.getElementById('connection-mode-btn');
        if (connectionModeBtn) {
            connectionModeBtn.addEventListener('click', () => {
                this.startConnectionMode();
            });
        }
        
        const cancelConnectionBtn = document.getElementById('cancel-connection-btn');
        if (cancelConnectionBtn) {
            cancelConnectionBtn.addEventListener('click', () => {
                this.cancelConnectionMode();
            });
        }
        
        // === Секция 5: Тестирование ===
        const findRouteBtn = document.getElementById('find-route-btn');
        const clearTestBtn = document.getElementById('clear-test-btn');
        
        if (findRouteBtn) {
            findRouteBtn.addEventListener('click', () => {
                this.testRoute();
            });
        }
        
        if (clearTestBtn) {
            clearTestBtn.addEventListener('click', () => {
                this.clearTest();
            });
        }
        
        // Обновляем кнопку создания точки
        this.updatePointCreationButton();
        
        console.log('UI маршрутизации инициализирован');
    }

    /**
     * Обновление селекта кабинетов
     */
    updateRoomSelect() {
        const roomSelect = document.getElementById('room-select');
        if (!roomSelect) {
            console.warn('Элемент room-select не найден');
            return;
        }
        
        roomSelect.innerHTML = '<option value="">Выберите кабинет</option>';
        
        const rooms = this.dataManager.getAllPolygons();
        console.log('Загрузка кабинетов в селект:', rooms.length);
        
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.id;
            option.textContent = room.name;
            roomSelect.appendChild(option);
        });
        
        console.log('Селект кабинетов обновлен:', rooms.length, 'кабинетов');
    }

    /**
     * Начало режима создания точки входа
     */
    startEntranceCreationMode() {
        const roomId = document.getElementById('room-select').value;
        if (!roomId) {
            Utils.showNotification('Выберите кабинет сначала', 'error');
            return;
        }
        
        const room = this.dataManager.getPolygon(roomId);
        if (!room) {
            Utils.showNotification('Кабинет не найден', 'error');
            return;
        }
        
        this.currentMode = 'entrance';
        this.selectedRoomId = roomId;
        
        // Показываем инструкцию
        Utils.showNotification(`Создание входа для "${room.name}". Кликните на карте у входа в кабинет.`, 'info');
        
        // Устанавливаем обработчик клика
        this.setupMapClickHandler();
        
        // Центрируем карту на кабинете и подсвечиваем его
        this.selectRoomForEntrance(roomId);
    }

    /**
     * Начало режима создания точки интереса
     */
    startPointCreationMode() {
        const pointName = document.getElementById('point-name-input').value.trim();
        if (!pointName) {
            Utils.showNotification('Введите название точки', 'error');
            return;
        }
        
        this.currentMode = 'point';
        this.pointName = pointName;
        this.isRoutingPoint = document.getElementById('routing-checkbox').checked;
        
        Utils.showNotification(`Создание точки "${pointName}". Кликните на карте.`, 'info');
        
        this.setupMapClickHandler();
    }

    /**
     * Настройка обработчика клика на карте
     */
    setupMapClickHandler() {
        // Удаляем старый обработчик
        if (this.mapClickHandler) {
            this.mapCore.map.off('click', this.mapClickHandler);
        }
        
        // Создаем новый обработчик
        this.mapClickHandler = (e) => {
            console.log('Клик на карте в режиме:', this.currentMode, e.latlng);
            
            if (this.currentMode === 'entrance') {
                this.createEntrancePoint(e.latlng);
            } else if (this.currentMode === 'point') {
                this.createInterestPoint(e.latlng);
            } else if (this.currentMode === 'connection') {
                this.handleConnectionClick(e);
            }
        };
        
        // Добавляем обработчик
        this.mapCore.map.on('click', this.mapClickHandler);
    }

    /**
     * Создание точки входа
     * @param {L.LatLng} latlng - Координаты
     */
    createEntrancePoint(latlng) {
        const roomId = this.selectedRoomId;
        const room = this.dataManager.getPolygon(roomId);
        
        if (!room) {
            Utils.showNotification('Кабинет не найден', 'error');
            return;
        }
        
        try {
            // Создаем узел в графе
            const node = this.routingGraph.createNode(latlng.lat, latlng.lng, {
                name: `Вход в ${room.name}`,
                type: 'room_entrance',
                category: 'room',
                color: '#3498db',
                metadata: {
                    roomId: roomId,
                    isRoutingPoint: true
                }
            });
            
            console.log('Создан узел:', node);
            
            // Сохраняем в dataManager
            this.dataManager.addNode(node);
            
            // Сбрасываем режим
            this.cancelCurrentMode();
            
            // Обновляем визуализацию
            this.routingVisual.renderGraph();
            
            // Обновляем селекты тестирования
            this.updateTestSelects();
            
            Utils.showNotification(`Точка входа "${node.name}" создана`, 'success');
            
            return node;
        } catch (error) {
            console.error('Ошибка создания точки входа:', error);
            Utils.showNotification('Ошибка создания точки: ' + error.message, 'error');
            return null;
        }
    }

    /**
     * Создание точки интереса
     * @param {L.LatLng} latlng - Координаты
     */
    createInterestPoint(latlng) {
        try {
            // Если точка участвует в маршрутизации, добавляем в граф
            if (this.isRoutingPoint) {
                const node = this.routingGraph.createNode(latlng.lat, latlng.lng, {
                    name: this.pointName,
                    type: 'point_of_interest',
                    category: 'point',
                    color: '#2ecc71',
                    metadata: {
                        isRoutingPoint: true
                    }
                });
                
                console.log('Создан узел точки интереса:', node);
                
                // Сохраняем в dataManager
                this.dataManager.addNode(node);
                
                // Обновляем визуализацию и селекты
                this.routingVisual.renderGraph();
                this.updateTestSelects();
                
                Utils.showNotification(`Точка маршрутизации "${this.pointName}" создана`, 'success');
                
                return node;
            } else {
                // Для визуальных точек создаем маркер
                this.createVisualMarker(latlng, {
                    name: this.pointName,
                    color: '#9b59b6'
                });
                Utils.showNotification(`Визуальная точка "${this.pointName}" создана`, 'success');
                return { name: this.pointName };
            }
            
        } catch (error) {
            console.error('Ошибка создания точки интереса:', error);
            Utils.showNotification('Ошибка создания точки: ' + error.message, 'error');
            return null;
        } finally {
            // Сбрасываем режим
            this.cancelCurrentMode();
            
            // Очищаем поле ввода
            document.getElementById('point-name-input').value = '';
            this.updatePointCreationButton();
        }
    }

    /**
     * Создание визуального маркера
     */
    createVisualMarker(latlng, pointData) {
        const marker = L.circleMarker([latlng.lat, latlng.lng], {
            radius: 8,
            color: pointData.color,
            fillColor: pointData.color,
            fillOpacity: 0.7,
            weight: 2,
            className: 'visual-point'
        }).addTo(this.mapCore.map);
        
        // Popup
        const popupContent = `
            <div style="padding: 10px; max-width: 250px;">
                <h4 style="margin: 0; color: ${pointData.color}">
                    <i class="fas fa-map-marker-alt"></i> ${Utils.escapeHtml(pointData.name)}
                </h4>
                <p><em>(Только для отображения)</em></p>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        
        // Сохраняем ссылку для возможности удаления
        if (!this.visualMarkers) {
            this.visualMarkers = [];
        }
        this.visualMarkers.push(marker);
    }

    /**
     * Начало режима соединения точек
     */
    startConnectionMode() {
        if (this.routingGraph.nodes.size < 2) {
            Utils.showNotification('Нужно хотя бы 2 точки маршрутизации для создания соединений', 'warning');
            return;
        }
        
        this.currentMode = 'connection';
        this.selectedPoints = [];
        
        Utils.showNotification('Режим соединения. Кликните на первую точку маршрутизации.', 'info');
        
        this.setupMapClickHandler();
    }

    /**
     * Обработчик клика для соединения
     */
    handleConnectionClick(e) {
        // Находим ближайшую точку маршрутизации
        const nearestNode = this.routingGraph.findNearestNode(e.latlng.lat, e.latlng.lng, 20);
        
        if (!nearestNode) {
            Utils.showNotification('Кликните на точку маршрутизации', 'warning');
            return;
        }
        
        // Добавляем точку в выбранные
        this.selectedPoints.push(nearestNode.id);
        
        // Подсвечиваем точку
        this.routingVisual.selectNode(nearestNode.id);
        
        // Если выбрано 2 точки - создаем соединение
        if (this.selectedPoints.length === 2) {
            this.createConnection(this.selectedPoints[0], this.selectedPoints[1]);
            this.selectedPoints = [];
            this.routingVisual.resetSelection();
        } else {
            Utils.showNotification('Теперь кликните на вторую точку', 'info');
        }
    }

    /**
     * Создание соединения
     */
    async createConnection(nodeAId, nodeBId) {
        const nodeA = this.routingGraph.getNode(nodeAId);
        const nodeB = this.routingGraph.getNode(nodeBId);
        
        if (!nodeA || !nodeB) {
            Utils.showNotification('Точки не найдены', 'error');
            return;
        }
        
        try {
            // Создаем ребро в графе
            const edge = this.routingGraph.createEdge(nodeAId, nodeBId, {
                name: `${nodeA.name} ↔ ${nodeB.name}`,
                isBidirectional: true,
                color: '#2ecc71',
                weight: 3
            });
            
            console.log('Создано ребро:', edge);
            
            // Сохраняем в dataManager
            this.dataManager.addEdge(nodeAId, nodeBId, edge);
            
            // Обновляем визуализацию
            this.routingVisual.renderGraph();
            
            Utils.showNotification(`Соединение создано: ${nodeA.name} ↔ ${nodeB.name}`, 'success');
            
            return edge;
        } catch (error) {
            console.error('Ошибка создания соединения:', error);
            Utils.showNotification('Ошибка создания соединения: ' + error.message, 'error');
            return null;
        }
    }

    /**
     * Обновление кнопки создания точки
     */
    updatePointCreationButton() {
        const pointName = document.getElementById('point-name-input')?.value.trim();
        const createBtn = document.getElementById('create-point-btn');
        
        if (createBtn) {
            createBtn.disabled = !pointName;
        }
    }

    /**
     * Отмена текущего режима
     */
    cancelCurrentMode() {
        this.currentMode = null;
        this.selectedPoints = [];
        this.selectedRoomId = null;
        this.pointName = null;
        
        // Убираем обработчик
        if (this.mapClickHandler) {
            this.mapCore.map.off('click', this.mapClickHandler);
            this.mapClickHandler = null;
        }
        
        // Обновляем UI
        this.updateUIState();
        
        // Сбрасываем выделение кабинета
        this.mapCore.resetDrawingMode();
    }

    /**
     * Отмена режима соединения
     */
    cancelConnectionMode() {
        this.cancelCurrentMode();
        this.routingVisual.resetSelection();
        Utils.showNotification('Режим соединения отменен', 'info');
    }

    /**
     * Обновление состояния UI
     */
    updateUIState() {
        const connectionModeBtn = document.getElementById('connection-mode-btn');
        const cancelConnectionBtn = document.getElementById('cancel-connection-btn');
        
        if (connectionModeBtn && cancelConnectionBtn) {
            if (this.currentMode === 'connection') {
                connectionModeBtn.style.display = 'none';
                cancelConnectionBtn.style.display = 'inline-block';
            } else {
                connectionModeBtn.style.display = 'inline-block';
                cancelConnectionBtn.style.display = 'none';
            }
        }
    }

    /**
     * Обновление селектов для тестирования
     */
    updateTestSelects() {
        const startSelect = document.getElementById('test-start-select');
        const endSelect = document.getElementById('test-end-select');
        
        if (!startSelect || !endSelect) return;
        
        startSelect.innerHTML = '<option value="">Выберите точку</option>';
        endSelect.innerHTML = '<option value="">Выберите точку</option>';
        
        // Получаем только точки маршрутизации
        const routingNodes = Array.from(this.routingGraph.nodes.values())
            .filter(node => node.metadata?.isRoutingPoint !== false);
        
        routingNodes.forEach(node => {
            const option = document.createElement('option');
            option.value = node.id;
            option.textContent = node.name;
            
            startSelect.appendChild(option.cloneNode(true));
            endSelect.appendChild(option);
        });
        
        console.log('Селекты тестирования обновлены:', routingNodes.length, 'точек');
    }

    /**
     * Получение выбранного кабинета для входа
     */
    selectRoomForEntrance(roomId) {
        if (!roomId) return;
        
        const room = this.dataManager.getPolygon(roomId);
        if (room) {
            // Центрируем на кабинете
            const center = Utils.getPolygonCenter(room.vertices);
            this.mapCore.map.setView([center[0], center[1]], 1);
            
            // Подсвечиваем кабинет
            this.mapCore.highlightRoom(roomId);
        }
    }

    /**
     * Тестирование маршрута
     */
    testRoute() {
        const startId = document.getElementById('test-start-select').value;
        const endId = document.getElementById('test-end-select').value;
        
        if (!startId || !endId) {
            Utils.showNotification('Выберите начальную и конечную точки', 'error');
            return;
        }
        
        console.log('Поиск маршрута:', startId, '->', endId);
        
        const result = this.routingGraph.findShortestPath(startId, endId);
        
        if (result.success) {
            // Визуализируем путь
            this.routingVisual.drawPath(result);
            
            // Показываем информацию
            this.showRouteInfo(result);
        } else {
            Utils.showNotification('Путь не найден: ' + (result.message || 'точки не соединены'), 'error');
        }
    }

    /**
     * Показ информации о маршруте
     */
    showRouteInfo(routeResult) {
        const startNode = routeResult.nodes[0];
        const endNode = routeResult.nodes[routeResult.nodes.length - 1];
        
        const infoHtml = `
            <div style="padding: 10px;">
                <h4 style="margin: 0; color: #2ecc71;">✅ Маршрут найден!</h4>
                <p><strong>От:</strong> ${Utils.escapeHtml(startNode.name)}</p>
                <p><strong>До:</strong> ${Utils.escapeHtml(endNode.name)}</p>
                <p><strong>Длина:</strong> ${routeResult.length.toFixed(1)} ед.</p>
                <p><strong>Точек в пути:</strong> ${routeResult.nodes.length}</p>
                <p><strong>Время поиска:</strong> ${routeResult.searchTime.toFixed(1)} мс</p>
            </div>
        `;
        
        const routeInfoDiv = document.getElementById('route-info');
        if (routeInfoDiv) {
            routeInfoDiv.innerHTML = infoHtml;
            routeInfoDiv.style.display = 'block';
        }
        
        Utils.showNotification(`Маршрут найден! Длина: ${routeResult.length.toFixed(1)} ед.`, 'success');
    }

    /**
     * Очистка теста
     */
    clearTest() {
        this.routingVisual.clearTempLayers();
        
        const routeInfoDiv = document.getElementById('route-info');
        if (routeInfoDiv) {
            routeInfoDiv.innerHTML = '';
            routeInfoDiv.style.display = 'none';
        }
        
        Utils.showNotification('Тест очищен', 'info');
    }
}

// Экспортируем класс для глобального использования
window.RoutingEditor = RoutingEditor;
