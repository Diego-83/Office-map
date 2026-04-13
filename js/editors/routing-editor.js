/**
 * РЕДАКТОР МАРШРУТОВ
 * Полная версия с работающей маршрутизацией и привязкой к кабинетам
 */

class RoutingEditor {
    constructor(mapCore, dataManager) {
        this.mapCore = mapCore;
        this.dataManager = dataManager;
        
        this.currentMode = null;
        this.selectedPoints = [];
        this.tempMarker = null;
        
        // Справочники для связи данных с визуальными элементами
        this.pointMarkers = new Map(); // pointId -> marker
        this.connectionLines = new Map(); // connectionId -> polyline
        
        // Для маршрута
        this.currentRouteLine = null;
        this.highlightedRooms = [];
        
        // ===== ОБРАБОТЧИК МОБИЛЬНОЙ МАРШРУТИЗАЦИИ =====
        this.setupMobileRoutingHandler();
        
        this.init();
    }

    /**
     * Настройка обработчика мобильной маршрутизации
     */
    setupMobileRoutingHandler() {
        window.addEventListener('mobile-routing-request', (e) => {
            console.log('Получен запрос на мобильную маршрутизацию:', e.detail);
            
            const { startId, endId } = e.detail;
            
            if (!startId || !endId) {
                console.error('Неверные ID точек:', startId, endId);
                return;
            }
            
            const startSelect = document.getElementById('test-start-select');
            const endSelect = document.getElementById('test-end-select');
            
            if (startSelect && endSelect) {
                const startOption = startSelect.querySelector(`option[value="${startId}"]`);
                const endOption = endSelect.querySelector(`option[value="${endId}"]`);
                
                if (!startOption || !endOption) {
                    console.error('Опции не найдены для ID:', startId, endId);
                    this.updateTestSelects();
                    
                    setTimeout(() => {
                        const newStartOption = startSelect.querySelector(`option[value="${startId}"]`);
                        const newEndOption = endSelect.querySelector(`option[value="${endId}"]`);
                        
                        if (newStartOption && newEndOption) {
                            startSelect.value = startId;
                            endSelect.value = endId;
                            this.updateFindRouteButton();
                            this.testRoute();
                        }
                    }, 100);
                    return;
                }
                
                startSelect.value = startId;
                endSelect.value = endId;
                this.updateFindRouteButton();
                this.testRoute();
                
                console.log('Мобильный маршрут успешно запущен');
            }
        });
    }

    /**
     * Инициализация
     */
    init() {
        console.log('Инициализация редактора маршрутов...');
        this.initUI();
        
        this.clearAllVisuals();
        this.loadAllVisualElements();
        this.updatePointsList();
        this.updateConnectionsList();
        this.updateTestSelects();
        console.log('Редактор маршрутов инициализирован');
    }

    /**
     * Очистка всех визуальных элементов
     */
    clearAllVisuals() {
        this.pointMarkers.forEach(marker => {
            if (marker && marker.remove) marker.remove();
        });
        this.pointMarkers.clear();
        
        this.connectionLines.forEach(line => {
            if (line && line.remove) line.remove();
        });
        this.connectionLines.clear();
        
        this.clearTest();
    }

    /**
     * Загрузка всех визуальных элементов из данных
     */
    loadAllVisualElements() {
        console.log('Загрузка визуальных элементов...');
        
        this.clearAllVisuals();
        
        const allPoints = this.dataManager.getAllPoints();
        console.log('Точек в данных:', allPoints.length);
        
        allPoints.forEach(point => {
            if (!this.pointMarkers.has(point.id)) {
                this.createPointMarker(point);
            }
        });
        
        const allConnections = this.dataManager.getAllConnections();
        console.log('Соединений в данных:', allConnections.length);
        
        allConnections.forEach(connection => {
            const pointA = this.dataManager.getPoint(connection.from);
            const pointB = this.dataManager.getPoint(connection.to);
            
            if (pointA && pointB) {
                if (!this.connectionLines.has(connection.id)) {
                    this.createConnectionLine(connection);
                }
            }
        });
        
        console.log(`Загружено: ${this.pointMarkers.size} маркеров, ${this.connectionLines.size} линий`);
    }

    /**
     * Инициализация UI
     */
    initUI() {
        console.log('Инициализация UI маршрутизации...');
        
        const createPointBtn = document.getElementById('create-point-btn');
        if (createPointBtn) {
            createPointBtn.addEventListener('click', () => {
                this.startPointCreationMode();
            });
        }
        
        const connectionModeBtn = document.getElementById('connection-mode-btn');
        const cancelConnectionBtn = document.getElementById('cancel-connection-btn');
        
        if (connectionModeBtn) {
            connectionModeBtn.addEventListener('click', () => {
                this.startConnectionMode();
            });
        }
        
        if (cancelConnectionBtn) {
            cancelConnectionBtn.addEventListener('click', () => {
                this.cancelCurrentMode();
            });
        }
        
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
        
        const resetPointsBtn = document.getElementById('reset-points-btn');
        const resetConnectionsBtn = document.getElementById('reset-connections-btn');
        
        if (resetPointsBtn) {
            resetPointsBtn.addEventListener('click', async () => {
                await this.resetAllPoints();
            });
        }
        
        if (resetConnectionsBtn) {
            resetConnectionsBtn.addEventListener('click', async () => {
                await this.resetAllConnections();
            });
        }
        
        const startSelect = document.getElementById('test-start-select');
        const endSelect = document.getElementById('test-end-select');
        
        if (startSelect && endSelect) {
            startSelect.addEventListener('change', () => this.updateFindRouteButton());
            endSelect.addEventListener('change', () => this.updateFindRouteButton());
        }
        
        this.updateUIState();
    }

    /**
     * Начало режима создания точки
     */
    startPointCreationMode() {
        const pointName = document.getElementById('point-name-input')?.value.trim();
        const pointType = document.getElementById('point-type-select')?.value || 'point_of_interest';
        const isRouting = document.getElementById('point-routing-checkbox')?.checked !== false;
        
        if (!pointName) {
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Введите название точки', 'error');
            }
            return;
        }
        
        this.currentMode = 'point';
        this.pointData = {
            name: pointName,
            type: pointType,
            isRouting: isRouting,
            color: this.getColorForType(pointType)
        };
        
        if (Utils && Utils.showNotification) {
            Utils.showNotification(`Создание точки "${pointName}". Кликните на карте.`, 'info');
        }
        
        this.setupMapClickHandler();
        this.updateUIState();
    }

    /**
     * Получение цвета для типа точки
     */
    getColorForType(type) {
        const colors = {
            'entrance': '#3498db',
            'point_of_interest': '#2ecc71',
            'connection': '#9b59b6'
        };
        return colors[type] || '#e74c3c';
    }

    /**
     * Начало режима соединения
     */
    startConnectionMode() {
        const routingPoints = this.dataManager.getRoutingPoints();
        
        if (routingPoints.length < 2) {
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Нужно хотя бы 2 точки для создания соединений', 'warning');
            }
            return;
        }
        
        this.currentMode = 'connection';
        this.selectedPoints = [];
        
        if (Utils && Utils.showNotification) {
            Utils.showNotification('Режим соединения. Кликните на первую точку.', 'info');
        }
        
        this.setupMapClickHandler();
        this.updateUIState();
    }

    /**
     * Настройка обработчика клика на карте
     */
    setupMapClickHandler() {
        if (this.mapClickHandler) {
            this.mapCore.map.off('click', this.mapClickHandler);
        }
        
        this.mapClickHandler = (e) => {
            if (this.currentMode === 'point') {
                this.createPoint(e.latlng);
            } else if (this.currentMode === 'connection') {
                this.handleConnectionClick(e.latlng);
            }
        };
        
        this.mapCore.map.on('click', this.mapClickHandler);
    }

    /**
     * Создание точки на карте
     */
    createPoint(latlng) {
        try {
            let nearestRoom = null;
            if (this.dataManager.findNearestRoomToPoint) {
                nearestRoom = this.dataManager.findNearestRoomToPoint(latlng.lat, latlng.lng, 50);
            }
            
            let roomId = null;
            
            if (nearestRoom) {
                roomId = nearestRoom.id;
                this.pointData.name = `${this.pointData.name} (${nearestRoom.name})`;
            }
            
            const point = this.dataManager.addPoint({
                ...this.pointData,
                y: latlng.lat,
                x: latlng.lng,
                roomId: roomId
            });
            
            this.createPointMarker(point);
            this.cancelCurrentMode();
            
            const pointNameInput = document.getElementById('point-name-input');
            if (pointNameInput) pointNameInput.value = '';
            
            this.updatePointsList();
            this.updateTestSelects();
            
            let message = `Точка "${point.name}" создана`;
            if (roomId) {
                message += ` (привязана к кабинету ${nearestRoom.name})`;
            }
            
            if (Utils && Utils.showNotification) {
                Utils.showNotification(message, 'success');
            }
            
            return point;
            
        } catch (error) {
            console.error('Ошибка создания точки:', error);
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Ошибка создания точки: ' + error.message, 'error');
            }
            return null;
        }
    }

    /**
     * Создание маркера точки
     */
    createPointMarker(point) {
        if (this.pointMarkers.has(point.id)) {
            return this.pointMarkers.get(point.id);
        }
        
        let iconClass = 'fa-map-marker-alt';
        if (point.type === 'entrance') iconClass = 'fa-door-open';
        if (point.type === 'connection') iconClass = 'fa-circle';
        if (point.roomId) iconClass = 'fa-door-closed';
        
        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="
                background-color: ${point.color};
                width: 28px;
                height: 28px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 14px;
                cursor: pointer;
            ">
                <i class="fas ${iconClass}"></i>
            </div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
        
        const marker = L.marker([point.y, point.x], {
            icon: icon,
            draggable: true,
            pointId: point.id
        }).addTo(this.mapCore.map);
        
        const room = point.roomId ? this.dataManager.getPolygon(point.roomId) : null;
        const popupContent = this.createPointPopup(point, room);
        
        marker.bindPopup(popupContent);
        
        marker.on('drag', (e) => {
            this.handlePointDrag(point.id, e.target.getLatLng());
        });
        
        marker.on('dragend', (e) => {
            this.handlePointDragEnd(point.id, e.target.getLatLng());
        });
        
        marker.on('click', (e) => {
            if (this.currentMode === 'connection') {
                this.handleMarkerClickForConnection(point.id);
                L.DomEvent.stopPropagation(e);
            }
        });
        
        this.pointMarkers.set(point.id, marker);
        
        return marker;
    }

    /**
     * Создание попапа для точки
     */
    createPointPopup(point, room) {
        let roomInfo = '';
        if (room) {
            roomInfo = `
                <div style="margin: 10px 0; padding: 8px; background: #e8f4fc; border-radius: 4px;">
                    <strong><i class="fas fa-door-closed"></i> Привязана к кабинету:</strong><br>
                    ${Utils ? Utils.escapeHtml(room.name) : room.name}
                    ${room.department ? `<br>Отдел: ${Utils ? Utils.escapeHtml(room.department) : room.department}` : ''}
                </div>
            `;
        }
        
        return `
            <div style="padding: 15px; max-width: 300px;">
                <h4 style="margin: 0 0 10px 0; color: ${point.color}; border-bottom: 2px solid ${point.color}; padding-bottom: 5px;">
                    <i class="fas fa-map-marker-alt"></i> ${Utils ? Utils.escapeHtml(point.name) : point.name}
                </h4>
                ${roomInfo}
                <div style="margin: 10px 0;">
                    <strong>Тип:</strong> ${this.getPointTypeLabel(point.type)}<br>
                    <strong>Координаты:</strong> y=${point.y.toFixed(1)}, x=${point.x.toFixed(1)}<br>
                    ${point.isRouting ? '<strong style="color: #27ae60;">✓ Участвует в маршрутизации</strong>' : 
                                      '<em style="color: #999;">Только для отображения</em>'}
                </div>
                <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 5px;">
                    <button onclick="window.app.routingEditor.showAttachRoomModal('${point.id}')" 
                            style="background: #3498db; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
                        <i class="fas fa-link"></i> Привязать к кабинету
                    </button>
                    <button onclick="window.app.routingEditor.deletePointFromMap('${point.id}')" 
                            style="background: #e74c3c; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
                        <i class="fas fa-trash"></i> Удалить точку
                    </button>
                </div>
                <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                    <i class="fas fa-info-circle"></i> Перетаскивайте для перемещения
                </div>
            </div>
        `;
    }

    /**
     * Получение читаемой метки типа точки
     */
    getPointTypeLabel(type) {
        const labels = {
            'entrance': 'Вход в кабинет',
            'point_of_interest': 'Точка интереса',
            'connection': 'Точка соединения'
        };
        return labels[type] || type;
    }

    /**
     * Обработчик клика для соединения
     */
    handleConnectionClick(latlng) {
        let nearestPoint = null;
        if (this.dataManager.findNearestPoint) {
            nearestPoint = this.dataManager.findNearestPoint(latlng.lat, latlng.lng, 30);
        }
        
        if (!nearestPoint) {
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Кликните на точку (не дальше 30px)', 'warning');
            }
            return;
        }
        
        if (nearestPoint.isRouting === false) {
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Эта точка не участвует в маршрутизации', 'warning');
            }
            return;
        }
        
        this.handleMarkerClickForConnection(nearestPoint.id);
    }

    /**
     * Обработчик клика на маркер для соединения
     */
    handleMarkerClickForConnection(pointId) {
        const marker = this.pointMarkers.get(pointId);
        if (!marker) return;
        
        this.selectedPoints.push(pointId);
        
        this.highlightPoint(pointId);
        
        if (this.selectedPoints.length === 2) {
            this.createConnection(this.selectedPoints[0], this.selectedPoints[1]);
            this.selectedPoints = [];
            this.clearHighlights();
        } else {
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Теперь кликните на вторую точку', 'info');
            }
        }
    }

    /**
     * Подсветка точки
     */
    highlightPoint(pointId) {
        const marker = this.pointMarkers.get(pointId);
        if (marker) {
            const originalIcon = marker.getIcon();
            const newIcon = L.divIcon({
                ...originalIcon.options,
                html: originalIcon.options.html.replace(
                    /background-color: [^;]+/, 
                    'background-color: #f39c12'
                )
            });
            marker.setIcon(newIcon);
        }
    }

    /**
     * Очистка подсветки
     */
    clearHighlights() {
        this.pointMarkers.forEach((marker, pointId) => {
            const point = this.dataManager.getPoint(pointId);
            if (point) {
                const originalIcon = marker.getIcon();
                const newIcon = L.divIcon({
                    ...originalIcon.options,
                    html: originalIcon.options.html.replace(
                        /background-color: [^;]+/, 
                        `background-color: ${point.color}`
                    )
                });
                marker.setIcon(newIcon);
            }
        });
    }

    /**
     * Создание соединения
     */
    async createConnection(pointAId, pointBId) {
        const pointA = this.dataManager.getPoint(pointAId);
        const pointB = this.dataManager.getPoint(pointBId);
        
        if (!pointA || !pointB) {
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Точки не найдены', 'error');
            }
            return;
        }
        
        if (pointAId === pointBId) {
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Нельзя соединить точку с самой собой', 'warning');
            }
            return;
        }
        
        try {
            const connection = this.dataManager.addConnection(pointAId, pointBId, {
                name: `${pointA.name} ↔ ${pointB.name}`,
                color: '#2ecc71',
                weight: 4,
                isBidirectional: true
            });
            
            this.createConnectionLine(connection);
            this.updateConnectionsList();
            
            if (Utils && Utils.showNotification) {
                Utils.showNotification(`Соединение создано: ${pointA.name} ↔ ${pointB.name}`, 'success');
            }
            
            return connection;
        } catch (error) {
            console.error('Ошибка создания соединения:', error);
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Ошибка создания соединения: ' + error.message, 'error');
            }
            return null;
        }
    }

    /**
     * Создание линии соединения
     */
    createConnectionLine(connection) {
        if (!connection) {
            console.error('Соединение не передано в createConnectionLine');
            return null;
        }
        
        if (this.connectionLines.has(connection.id)) {
            return this.connectionLines.get(connection.id);
        }
        
        const pointA = this.dataManager.getPoint(connection.from);
        const pointB = this.dataManager.getPoint(connection.to);
        
        if (!pointA || !pointB) {
            console.error('Не найдены точки для соединения:', connection.from, connection.to);
            return null;
        }
        
        try {
            const line = L.polyline([
                [pointA.y, pointA.x],
                [pointB.y, pointB.x]
            ], {
                color: connection.color || '#2ecc71',
                weight: connection.weight || 4,
                opacity: 0.8,
                dashArray: '5, 5',
                className: 'connection-line',
                connectionId: connection.id
            }).addTo(this.mapCore.map);
            
            const popupContent = `
                <div style="padding: 15px; max-width: 300px;">
                    <h4 style="margin: 0 0 10px 0; color: ${connection.color || '#2ecc71'}">
                        <i class="fas fa-link"></i> Соединение
                    </h4>
                    <div style="margin: 10px 0;">
                        <strong>От:</strong> ${Utils ? Utils.escapeHtml(pointA.name) : pointA.name}<br>
                        <strong>До:</strong> ${Utils ? Utils.escapeHtml(pointB.name) : pointB.name}<br>
                        <strong>Длина:</strong> ${connection.length ? connection.length.toFixed(1) : '0.0'} ед.<br>
                        <strong>Направление:</strong> ${connection.isBidirectional ? '↔ Двустороннее' : '→ Одностороннее'}
                    </div>
                    <button onclick="window.app.routingEditor.deleteConnectionFromMap('${connection.id}')" 
                            style="background: #e74c3c; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 5px;">
                        <i class="fas fa-trash"></i> Удалить соединение
                    </button>
                </div>
            `;
            
            line.bindPopup(popupContent);
            this.connectionLines.set(connection.id, line);
            
            return line;
            
        } catch (error) {
            console.error('Ошибка создания линии:', error);
            return null;
        }
    }

    /**
     * Обработчик перетаскивания точки
     */
    handlePointDrag(pointId, latlng) {
        const point = this.dataManager.getPoint(pointId);
        if (!point) return;
        
        const marker = this.pointMarkers.get(pointId);
        if (marker) {
            marker.setLatLng(latlng);
        }
        
        this.updateConnectionLinesForPoint(pointId, latlng);
    }

    /**
     * Обработчик окончания перетаскивания
     */
    handlePointDragEnd(pointId, latlng) {
        const point = this.dataManager.getPoint(pointId);
        if (!point) return;
        
        this.dataManager.updatePoint(pointId, {
            y: latlng.lat,
            x: latlng.lng
        });
        
        this.recalculateAllConnectionLinesForPoint(pointId);
        
        if (Utils && Utils.showNotification) {
            Utils.showNotification('Точка перемещена', 'info');
        }
    }

    /**
     * Обновление линий соединений для точки
     */
    updateConnectionLinesForPoint(pointId, newLatLng) {
        if (!this.dataManager.getConnectionsByPoint) return;
        
        const connections = this.dataManager.getConnectionsByPoint(pointId);
        
        connections.forEach(conn => {
            const line = this.connectionLines.get(conn.id);
            if (!line) return;
            
            const otherPointId = conn.from === pointId ? conn.to : conn.from;
            const otherPoint = this.dataManager.getPoint(otherPointId);
            
            if (!otherPoint) return;
            
            const from = conn.from === pointId ? newLatLng : [otherPoint.y, otherPoint.x];
            const to = conn.to === pointId ? newLatLng : [otherPoint.y, otherPoint.x];
            
            line.setLatLngs([from, to]);
        });
    }

    /**
     * Пересчет всех линий для точки
     */
    recalculateAllConnectionLinesForPoint(pointId) {
        if (!this.dataManager.getConnectionsByPoint) return;
        
        const connections = this.dataManager.getConnectionsByPoint(pointId);
        
        connections.forEach(conn => {
            const pointA = this.dataManager.getPoint(conn.from);
            const pointB = this.dataManager.getPoint(conn.to);
            
            if (!pointA || !pointB) return;
            
            const line = this.connectionLines.get(conn.id);
            if (line) {
                line.setLatLngs([
                    [pointA.y, pointA.x],
                    [pointB.y, pointB.x]
                ]);
            }
            
            const length = Math.sqrt(
                Math.pow(pointB.y - pointA.y, 2) + 
                Math.pow(pointB.x - pointA.x, 2)
            );
            
            this.dataManager.updateConnection(conn.id, {
                length: length
            });
        });
    }

    /**
     * Обновление списка точек
     */
    updatePointsList() {
        const container = document.getElementById('points-list');
        if (!container) return;
        
        const points = this.dataManager.getAllPoints();
        
        if (points.length === 0) {
            container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #666;">
                    <i class="fas fa-map-marker-alt" style="font-size: 2em; margin-bottom: 10px; display: block;"></i>
                    Нет точек
                </div>
            `;
            return;
        }
        
        const html = points.map(point => {
            const iconClass = point.type === 'entrance' ? 'fa-door-open' : 
                            point.type === 'connection' ? 'fa-circle' : 'fa-map-marker-alt';
            const room = point.roomId ? this.dataManager.getPolygon(point.roomId) : null;
            const roomInfo = room ? `<br><small style="color: #3498db;"><i class="fas fa-door-closed"></i> ${Utils ? Utils.escapeHtml(room.name) : room.name}</small>` : '';
            
            return `
                <div class="object-item" data-id="${point.id}">
                    <div class="object-header">
                        <div class="object-name">
                            <i class="fas ${iconClass}" style="color: ${point.color}; margin-right: 8px;"></i>
                            ${Utils ? Utils.escapeHtml(point.name) : point.name}
                            ${!point.isRouting ? '<span style="font-size: 0.8em; color: #999; margin-left: 8px;">(визуальная)</span>' : ''}
                        </div>
                        <div class="object-actions">
                            <button class="btn-icon delete-point" title="Удалить">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div style="font-size: 0.9em; color: #666; margin-top: 5px;">
                        ${this.getPointTypeLabel(point.type)}
                        ${roomInfo}
                        <span style="float: right; font-size: 0.8em; color: #888;">
                            y=${point.y.toFixed(1)}, x=${point.x.toFixed(1)}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
        
        container.querySelectorAll('.object-item').forEach(item => {
            const pointId = item.dataset.id;
            
            const deleteBtn = item.querySelector('.delete-point');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await this.deletePoint(pointId);
                });
            }
            
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-icon')) {
                    this.selectPointOnMap(pointId);
                }
            });
        });
    }

    /**
     * Обновление списка соединений
     */
    updateConnectionsList() {
        const container = document.getElementById('connections-list');
        if (!container) return;
        
        const connections = this.dataManager.getAllConnections();
        
        if (connections.length === 0) {
            container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #666;">
                    <i class="fas fa-link" style="font-size: 2em; margin-bottom: 10px; display: block;"></i>
                    Нет соединений
                </div>
            `;
            return;
        }
        
        const html = connections.map(conn => {
            const pointA = this.dataManager.getPoint(conn.from);
            const pointB = this.dataManager.getPoint(conn.to);
            
            if (!pointA || !pointB) return '';
            
            return `
                <div class="object-item" data-id="${conn.id}">
                    <div class="object-header">
                        <div class="object-name">
                            <i class="fas fa-link" style="color: ${conn.color}; margin-right: 8px;"></i>
                            📍 ${Utils ? Utils.escapeHtml(pointA.name) : pointA.name} ↔ 📍 ${Utils ? Utils.escapeHtml(pointB.name) : pointB.name}
                        </div>
                        <div class="object-actions">
                            <button class="btn-icon delete-connection" title="Удалить">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div style="font-size: 0.9em; color: #666; margin-top: 5px;">
                        Длина: ${conn.length.toFixed(1)} ед.
                        <span style="float: right; font-size: 0.8em; color: #888;">
                            ${conn.isBidirectional ? '↔ Двустороннее' : '→ Одностороннее'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
        
        container.querySelectorAll('.object-item').forEach(item => {
            const connId = item.dataset.id;
            
            const deleteBtn = item.querySelector('.delete-connection');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await this.deleteConnection(connId);
                });
            }
        });
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
        
        const routingPoints = this.dataManager.getRoutingPoints();
        
        routingPoints.forEach(point => {
            const room = point.roomId ? this.dataManager.getPolygon(point.roomId) : null;
            const roomSuffix = room ? ` (${room.name})` : '';
            
            const option = document.createElement('option');
            option.value = point.id;
            option.textContent = point.name + roomSuffix;
            
            startSelect.appendChild(option.cloneNode(true));
            endSelect.appendChild(option);
        });
        
        this.updateFindRouteButton();
    }

    /**
     * Обновление кнопки поиска маршрута
     */
    updateFindRouteButton() {
        const startSelect = document.getElementById('test-start-select');
        const endSelect = document.getElementById('test-end-select');
        const findRouteBtn = document.getElementById('find-route-btn');
        
        if (startSelect && endSelect && findRouteBtn) {
            findRouteBtn.disabled = !(startSelect.value && endSelect.value && startSelect.value !== endSelect.value);
        }
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
     * Отмена текущего режима
     */
    cancelCurrentMode() {
        this.currentMode = null;
        this.selectedPoints = [];
        this.pointData = null;
        
        if (this.mapClickHandler) {
            this.mapCore.map.off('click', this.mapClickHandler);
            this.mapClickHandler = null;
        }
        
        this.clearHighlights();
        
        if (this.tempMarker) {
            this.tempMarker.remove();
            this.tempMarker = null;
        }
        
        this.updateUIState();
        if (Utils && Utils.showNotification) {
            Utils.showNotification('Режим отменен', 'info');
        }
    }

    /**
     * Выбор точки на карте
     */
    selectPointOnMap(pointId) {
        const point = this.dataManager.getPoint(pointId);
        if (!point) return;
        
        this.mapCore.map.setView([point.y, point.x], 1);
        
        const marker = this.pointMarkers.get(pointId);
        if (marker) {
            marker.openPopup();
        }
    }

    /**
     * Удаление точки
     */
    async deletePoint(pointId) {
        const point = this.dataManager.getPoint(pointId);
        if (!point) return false;
        
        let confirmed = false;
        if (Utils && Utils.showModal) {
            confirmed = await Utils.showModal(
                'Удаление точки',
                `Удалить точку "${point.name}"? Все соединения с этой точкой будут удалены.`,
                'warning'
            );
        } else {
            confirmed = confirm(`Удалить точку "${point.name}"? Все соединения с этой точкой будут удалены.`);
        }
        
        if (!confirmed) return false;
        
        let connections = [];
        if (this.dataManager.getConnectionsByPoint) {
            connections = this.dataManager.getConnectionsByPoint(pointId);
        }
        
        connections.forEach(conn => {
            const line = this.connectionLines.get(conn.id);
            if (line) {
                line.remove();
                this.connectionLines.delete(conn.id);
            }
        });
        
        const marker = this.pointMarkers.get(pointId);
        if (marker) {
            marker.remove();
            this.pointMarkers.delete(pointId);
        }
        
        const success = this.dataManager.deletePoint(pointId);
        
        if (success) {
            this.updatePointsList();
            this.updateConnectionsList();
            this.updateTestSelects();
            
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Точка удалена', 'success');
            }
            return true;
        } else {
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Ошибка удаления точки', 'error');
            }
            return false;
        }
    }

    /**
     * Удаление точки с карты (публичный метод)
     */
    deletePointFromMap(pointId) {
        this.deletePoint(pointId);
    }

    /**
     * Удаление соединения
     */
    async deleteConnection(connectionId) {
        const connection = this.dataManager.getConnection(connectionId);
        if (!connection) return false;
        
        const pointA = this.dataManager.getPoint(connection.from);
        const pointB = this.dataManager.getPoint(connection.to);
        
        if (!pointA || !pointB) return false;
        
        let confirmed = false;
        if (Utils && Utils.showModal) {
            confirmed = await Utils.showModal(
                'Удаление соединения',
                `Удалить соединение между "${pointA.name}" и "${pointB.name}"?`,
                'warning'
            );
        } else {
            confirmed = confirm(`Удалить соединение между "${pointA.name}" и "${pointB.name}"?`);
        }
        
        if (!confirmed) return false;
        
        const line = this.connectionLines.get(connectionId);
        if (line) {
            line.remove();
            this.connectionLines.delete(connectionId);
        }
        
        const success = this.dataManager.deleteConnection(connectionId);
        
        if (success) {
            this.updateConnectionsList();
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Соединение удалено', 'success');
            }
            return true;
        } else {
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Ошибка удаления соединения', 'error');
            }
            return false;
        }
    }

    /**
     * Удаление соединения с карты (публичный метод)
     */
    deleteConnectionFromMap(connectionId) {
        this.deleteConnection(connectionId);
    }

    /**
     * ========================================================
     * МЕТОД: Привязка точки к кабинету с модальным окном
     * ========================================================
     */
    showAttachRoomModal(pointId) {
        console.log('Показ модального окна для привязки точки:', pointId);
        
        const point = this.dataManager.getPoint(pointId);
        if (!point) {
            alert('Точка не найдена');
            return;
        }
        
        const polygons = this.dataManager.getAllPolygons?.() || [];
        if (polygons.length === 0) {
            alert('Нет кабинетов для привязки');
            return;
        }
        
        // Удаляем предыдущее модальное окно если было
        const oldModal = document.getElementById('room-select-modal');
        if (oldModal) oldModal.remove();
        
        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.id = 'room-select-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        
        const options = polygons.map(room => 
            `<option value="${room.id}" ${point.roomId === room.id ? 'selected' : ''}>${room.name}${room.department ? ' - ' + room.department : ''}</option>`
        ).join('');
        
        modal.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            ">
                <h3 style="margin: 0 0 20px 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                    <i class="fas fa-door-closed" style="color: #3498db;"></i> Привязка к кабинету
                </h3>
                
                <div style="margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                    <p><strong>Точка:</strong> ${Utils ? Utils.escapeHtml(point.name) : point.name}</p>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2c3e50;">Выберите кабинет:</label>
                    <select id="modal-room-select" style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                        ${options}
                    </select>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="modal-cancel" style="padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-times"></i> Отмена
                    </button>
                    <button id="modal-confirm" style="padding: 10px 20px; background: #2ecc71; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-link"></i> Привязать
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('modal-cancel').onclick = () => modal.remove();
        document.getElementById('modal-confirm').onclick = () => {
            const select = document.getElementById('modal-room-select');
            const selectedRoomId = select.value;
            const selectedRoom = polygons.find(r => r.id === selectedRoomId);
            
            if (selectedRoom) {
                this.executeRoomAttachment(pointId, selectedRoom);
            }
            modal.remove();
        };
        
        // Закрытие по клику вне окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Выполнение привязки точки к кабинету
     */
    executeRoomAttachment(pointId, selectedRoom) {
        const point = this.dataManager.getPoint(pointId);
        
        const updated = this.dataManager.updatePoint(pointId, {
            roomId: selectedRoom.id
        });
        
        if (updated) {
            if (!point.name.includes(selectedRoom.name)) {
                this.dataManager.updatePoint(pointId, {
                    name: `${point.name} (${selectedRoom.name})`
                });
            }
            
            const marker = this.pointMarkers.get(pointId);
            if (marker) {
                const iconClass = 'fa-door-closed';
                const updatedPoint = this.dataManager.getPoint(pointId);
                
                const newIcon = L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="
                        background-color: ${updatedPoint.color};
                        width: 28px;
                        height: 28px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 14px;
                        cursor: pointer;
                    ">
                        <i class="fas ${iconClass}"></i>
                    </div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                });
                
                marker.setIcon(newIcon);
                
                const newPopupContent = this.createPointPopup(updatedPoint, selectedRoom);
                marker.setPopupContent(newPopupContent);
            }
            
            this.updatePointsList();
            this.updateTestSelects();
            
            if (Utils && Utils.showNotification) {
                Utils.showNotification(`Точка привязана к кабинету "${selectedRoom.name}"`, 'success');
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * ========================================================
     * МЕТОДЫ МАРШРУТИЗАЦИИ
     * ========================================================
     */

    /**
     * Тестирование маршрута
     */
    testRoute() {
        const startSelect = document.getElementById('test-start-select');
        const endSelect = document.getElementById('test-end-select');
        
        if (!startSelect || !endSelect) {
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Элементы выбора маршрута не найдены', 'error');
            }
            return;
        }
        
        const startId = startSelect.value;
        const endId = endSelect.value;
        
        if (!startId || !endId) {
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Выберите начальную и конечную точки', 'error');
            }
            return;
        }
        
        if (startId === endId) {
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Начальная и конечная точки совпадают', 'warning');
            }
            return;
        }
        
        console.log('Поиск маршрута:', startId, '->', endId);
        
        const result = this.findPathBFS(startId, endId);
        
        if (result.success) {
            this.showRoute(result.path);
            this.showRouteInfo(result);
        } else {
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Путь не найден: ' + (result.message || 'точки не соединены'), 'error');
            }
        }
    }

    /**
     * Поиск пути BFS
     */
    findPathBFS(startId, endId) {
        console.log('Поиск пути BFS:', startId, '->', endId);
        
        const startTime = performance.now();
        
        const startPoint = this.dataManager.getPoint(startId);
        const endPoint = this.dataManager.getPoint(endId);
        
        if (!startPoint || !endPoint) {
            return {
                success: false,
                message: 'Точки не найдены'
            };
        }
        
        // Создаем граф из соединений
        const graph = {};
        const connections = this.dataManager.getAllConnections();
        
        connections.forEach(conn => {
            if (!graph[conn.from]) graph[conn.from] = [];
            if (!graph[conn.to]) graph[conn.to] = [];
            
            graph[conn.from].push({
                node: conn.to,
                length: conn.length,
                connection: conn
            });
            
            if (conn.isBidirectional !== false) {
                graph[conn.to].push({
                    node: conn.from,
                    length: conn.length,
                    connection: conn
                });
            }
        });
        
        console.log('Граф создан, узлов:', Object.keys(graph).length);
        
        if (!graph[startId]) {
            return {
                success: false,
                message: 'Стартовая точка не соединена с другими точками'
            };
        }
        
        // BFS поиск
        const queue = [startId];
        const visited = { [startId]: true };
        const prev = { [startId]: null };
        const distances = { [startId]: 0 };
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            if (current === endId) {
                // Восстанавливаем путь
                const path = [];
                let node = endId;
                let totalLength = 0;
                
                while (node !== null) {
                    path.unshift(node);
                    node = prev[node];
                }
                
                // Рассчитываем длину
                for (let i = 0; i < path.length - 1; i++) {
                    const from = path[i];
                    const to = path[i + 1];
                    
                    const connection = connections.find(conn => 
                        (conn.from === from && conn.to === to) ||
                        (conn.from === to && conn.to === from)
                    );
                    
                    if (connection) {
                        totalLength += connection.length;
                    }
                }
                
                const endTime = performance.now();
                
                console.log('✅ Путь найден!', {
                    длина: totalLength,
                    точки: path.length,
                    время: endTime - startTime
                });
                
                return {
                    success: true,
                    path: path,
                    length: totalLength,
                    nodes: path.map(id => this.dataManager.getPoint(id)),
                    searchTime: endTime - startTime
                };
            }
            
            if (graph[current]) {
                for (const neighbor of graph[current]) {
                    if (!visited[neighbor.node]) {
                        visited[neighbor.node] = true;
                        prev[neighbor.node] = current;
                        distances[neighbor.node] = distances[current] + neighbor.length;
                        queue.push(neighbor.node);
                    }
                }
            }
        }
        
        const endTime = performance.now();
        console.log('❌ Путь не найден');
        
        return {
            success: false,
            message: 'Путь не найден',
            searchTime: endTime - startTime
        };
    }

    /**
     * Показ маршрута на карте
     */
    showRoute(path) {
        this.clearTest();
        
        if (!path || path.length < 2) return;
        
        const coordinates = [];
        const roomsToHighlight = new Set();
        
        path.forEach(pointId => {
            const point = this.dataManager.getPoint(pointId);
            if (point) {
                coordinates.push([point.y, point.x]);
                if (point.roomId) {
                    roomsToHighlight.add(point.roomId);
                }
            }
        });
        
        console.log('Показ маршрута:', coordinates.length, 'точек');
        
        this.currentRouteLine = L.polyline(coordinates, {
            color: '#27ae60',
            weight: 8,
            opacity: 0.9,
            dashArray: '15, 15',
            className: 'route-line'
        }).addTo(this.mapCore.map);
        
        this.clearRoomHighlights();
        roomsToHighlight.forEach(roomId => {
            this.highlightRoom(roomId);
        });
        
        if (coordinates.length > 0) {
            this.mapCore.map.fitBounds(coordinates, { padding: [50, 50] });
        }
    }

    /**
     * Показ информации о маршруте
     */
    showRouteInfo(routeResult) {
        const startNode = routeResult.nodes[0];
        const endNode = routeResult.nodes[routeResult.nodes.length - 1];
        
        const infoHtml = `
            <div style="padding: 15px;">
                <h4 style="margin: 0 0 15px 0; color: #2ecc71; border-bottom: 2px solid #2ecc71; padding-bottom: 8px;">
                    <i class="fas fa-check-circle"></i> Маршрут найден!
                </h4>
                <p><strong>От:</strong> ${startNode?.name || '?'}</p>
                <p><strong>До:</strong> ${endNode?.name || '?'}</p>
                <p><strong>Длина:</strong> ${routeResult.length.toFixed(1)} ед.</p>
                <p><strong>Точек на пути:</strong> ${routeResult.path.length}</p>
                <p style="margin-top: 10px; font-size: 0.9em; color: #666;">
                    <i class="fas fa-info-circle"></i> Время поиска: ${routeResult.searchTime.toFixed(1)} мс
                </p>
            </div>
        `;
        
        const routeInfoDiv = document.getElementById('route-info');
        if (routeInfoDiv) {
            routeInfoDiv.innerHTML = infoHtml;
            routeInfoDiv.style.display = 'block';
        }
        
        if (Utils && Utils.showNotification) {
            Utils.showNotification(`Маршрут найден: ${startNode?.name} → ${endNode?.name}`, 'success');
        }
    }

    /**
     * Подсветка кабинета
     */
    highlightRoom(roomId) {
        const room = this.dataManager.getPolygon(roomId);
        if (!room || !room.vertices) return;
        
        const highlightedPolygon = L.polygon(room.vertices, {
            color: '#f39c12',
            fillColor: '#f39c12',
            fillOpacity: 0.3,
            weight: 4,
            className: 'highlighted-room'
        }).addTo(this.mapCore.map);
        
        this.highlightedRooms.push(highlightedPolygon);
        
        highlightedPolygon.bindPopup(`
            <div style="padding: 10px;">
                <h4 style="margin: 0; color: #f39c12;">
                    <i class="fas fa-door-closed"></i> ${Utils ? Utils.escapeHtml(room.name) : room.name}
                </h4>
                ${room.department ? `<p><strong>Отдел:</strong> ${Utils ? Utils.escapeHtml(room.department) : room.department}</p>` : ''}
                <p><em>Кабинет подсвечен из-за маршрута</em></p>
            </div>
        `);
    }

    /**
     * Очистка подсветки кабинетов
     */
    clearRoomHighlights() {
        this.highlightedRooms.forEach(polygon => {
            polygon.remove();
        });
        this.highlightedRooms = [];
    }

    /**
     * Очистка теста
     */
    clearTest() {
        if (this.currentRouteLine) {
            this.currentRouteLine.remove();
            this.currentRouteLine = null;
        }
        
        this.clearRoomHighlights();
        
        const routeInfoDiv = document.getElementById('route-info');
        if (routeInfoDiv) {
            routeInfoDiv.innerHTML = '';
            routeInfoDiv.style.display = 'none';
        }
    }

    /**
     * Сброс всех точек
     */
    async resetAllPoints() {
        let confirmed = false;
        if (Utils && Utils.showModal) {
            confirmed = await Utils.showModal(
                'Сброс всех точек',
                'Удалить ВСЕ точки и соединения? Это действие необратимо!',
                'danger'
            );
        } else {
            confirmed = confirm('Удалить ВСЕ точки и соединения? Это действие необратимо!');
        }
        
        if (!confirmed) return;
        
        this.pointMarkers.forEach(marker => {
            if (marker && marker.remove) marker.remove();
        });
        this.pointMarkers.clear();
        
        this.connectionLines.forEach(line => {
            if (line && line.remove) line.remove();
        });
        this.connectionLines.clear();
        
        this.clearTest();
        
        const success = this.dataManager.clearPoints();
        
        if (success) {
            this.updatePointsList();
            this.updateConnectionsList();
            this.updateTestSelects();
            
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Все точки и соединения удалены', 'success');
            }
        }
    }

    /**
     * Сброс всех соединений
     */
    async resetAllConnections() {
        let confirmed = false;
        if (Utils && Utils.showModal) {
            confirmed = await Utils.showModal(
                'Сброс всех соединений',
                'Удалить ВСЕ соединения? Точки останутся. Это действие необратимо!',
                'warning'
            );
        } else {
            confirmed = confirm('Удалить ВСЕ соединения? Точки останутся. Это действие необратимо!');
        }
        
        if (!confirmed) return;
        
        this.connectionLines.forEach(line => {
            if (line && line.remove) line.remove();
        });
        this.connectionLines.clear();
        
        const success = this.dataManager.clearConnections();
        
        if (success) {
            this.updateConnectionsList();
            if (Utils && Utils.showNotification) {
                Utils.showNotification('Все соединения удалены', 'success');
            }
        }
    }

    /**
     * Обновление всех визуальных элементов
     */
    updateAllVisuals() {
        this.loadAllVisualElements();
        this.updatePointsList();
        this.updateConnectionsList();
        this.updateTestSelects();
    }
}

// Экспортируем класс
window.RoutingEditor = RoutingEditor;

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ =====
if (typeof window !== 'undefined') {
    window.testRoute = () => {
        if (window.routingEditor) {
            window.routingEditor.testRoute();
        } else if (window.app && window.app.routingEditor) {
            window.app.routingEditor.testRoute();
        }
    };
    
    window.updateFindRouteButton = () => {
        if (window.routingEditor) {
            window.routingEditor.updateFindRouteButton();
        } else if (window.app && window.app.routingEditor) {
            window.app.routingEditor.updateFindRouteButton();
        }
    };
    
    window.findRoute = window.testRoute;
    window.routingEditorTestRoute = window.testRoute;
}
