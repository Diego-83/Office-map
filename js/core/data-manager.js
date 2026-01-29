/**
 * Менеджер данных - управление хранением и обработкой данных
 * ДОПОЛНЕННЫЙ ДЛЯ РАБОТЫ С ГРАФОВОЙ СИСТЕМОЙ
 */

class DataManager {
    constructor() {
        this.data = {
            rooms: [],
            points: [],
            routes: [],
            routePoints: [],
            // Новые структуры для графа
            graphNodes: [],    // Узлы графа (точки маршрутизации)
            graphEdges: [],    // Рёбра графа (соединения между узлами)
            metadata: {
                version: '2.0',
                lastModified: new Date().toISOString(),
                created: new Date().toISOString()
            }
        };
        
        this.loadData();
    }

    /**
     * Загрузка данных из localStorage
     */
    loadData() {
        try {
            const savedData = Utils.loadFromLocalStorage('office_map_data');
            if (savedData) {
                // Миграция данных из старой версии
                this.migrateData(savedData);
                console.log('Данные загружены из localStorage:', {
                    rooms: this.data.rooms.length,
                    points: this.data.points.length,
                    routes: this.data.routes.length,
                    graphNodes: this.data.graphNodes.length,
                    graphEdges: this.data.graphEdges.length
                });
            } else {
                console.log('Данные не найдены, инициализирую пустые');
            }
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }

    /**
     * Миграция данных из старой версии
     * @param {object} savedData - Загруженные данные
     */
    migrateData(savedData) {
        // Копируем основные данные
        this.data.rooms = savedData.rooms || [];
        this.data.points = savedData.points || [];
        this.data.routes = savedData.routes || [];
        this.data.routePoints = savedData.routePoints || [];
        
        // Мигрируем точки в узлы графа
        if (savedData.points && savedData.points.length > 0 && !savedData.graphNodes) {
            console.log('Миграция точек в узлы графа...');
            this.data.graphNodes = savedData.points.map(point => ({
                id: point.id,
                name: point.name,
                type: point.type === 'door' ? 'door' : 'point_of_interest',
                category: 'point',
                color: point.color,
                y: point.y,
                x: point.x,
                isDraggable: true,
                metadata: {
                    originalPointId: point.id,
                    isRoutingPoint: true,
                    description: point.description || ''
                }
            }));
        } else {
            this.data.graphNodes = savedData.graphNodes || [];
        }
        
        // Мигрируем маршруты в рёбра графа
        if (savedData.routes && savedData.routes.length > 0 && !savedData.graphEdges) {
            console.log('Миграция маршрутов в рёбра графа...');
            this.data.graphEdges = [];
            // TODO: более сложная миграция маршрутов в рёбра
        } else {
            this.data.graphEdges = savedData.graphEdges || [];
        }
        
        // Сохраняем метаданные
        this.data.metadata = {
            version: '2.0',
            lastModified: new Date().toISOString(),
            created: savedData.metadata?.created || new Date().toISOString()
        };
    }

    /**
     * Сохранение данных в localStorage
     * @returns {boolean} Успешно ли сохранено
     */
    saveData() {
        try {
            this.data.metadata.lastModified = new Date().toISOString();
            const success = Utils.saveToLocalStorage('office_map_data', this.data);
            
            if (success) {
                console.log('Данные сохранены:', {
                    rooms: this.data.rooms.length,
                    points: this.data.points.length,
                    routes: this.data.routes.length,
                    graphNodes: this.data.graphNodes.length,
                    graphEdges: this.data.graphEdges.length
                });
                return true;
            } else {
                console.error('Не удалось сохранить данные');
                return false;
            }
        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
            return false;
        }
    }

    /**
     * Получение всех данных
     * @returns {object} Все данные
     */
    getData() {
        return Utils.deepCopy(this.data);
    }

    /**
     * Получение статистики
     * @returns {object} Статистика
     */
    getStats() {
        return {
            rooms: this.data.rooms.length,
            points: this.data.points.length,
            routes: this.data.routes.length,
            routePoints: this.data.routePoints.length,
            graphNodes: this.data.graphNodes.length,
            graphEdges: this.data.graphEdges.length,
            total: this.data.rooms.length + this.data.points.length + 
                   this.data.routes.length + this.data.graphNodes.length + 
                   this.data.graphEdges.length
        };
    }

    // ========== МЕТОДЫ ДЛЯ КАБИНЕТОВ ==========
    // (без изменений, оставляем существующие методы)

    getAllPolygons() {
        return Utils.deepCopy(this.data.rooms);
    }

    getPolygon(id) {
        return this.data.rooms.find(room => room.id === id) || null;
    }

    addPolygon(polygonData) {
        try {
            if (!polygonData.name || !polygonData.vertices || polygonData.vertices.length < 3) {
                throw new Error('Неверные данные кабинета');
            }

            const polygon = {
                id: Utils.generateId(),
                name: polygonData.name.trim(),
                department: polygonData.department?.trim() || '',
                employees: polygonData.employees?.trim() || '',
                phone: polygonData.phone?.trim() || '',
                color: polygonData.color || '#3498db',
                vertices: Utils.deepCopy(polygonData.vertices),
                area: polygonData.area || Utils.calculatePolygonArea(polygonData.vertices),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.data.rooms.push(polygon);
            this.saveData();
            
            console.log('Кабинет добавлен:', polygon.id, polygon.name);
            return Utils.deepCopy(polygon);
            
        } catch (error) {
            console.error('Ошибка добавления кабинета:', error);
            throw error;
        }
    }

    updatePolygon(id, polygonData) {
        try {
            const index = this.data.rooms.findIndex(room => room.id === id);
            if (index === -1) {
                throw new Error('Кабинет не найден');
            }

            const original = this.data.rooms[index];
            
            this.data.rooms[index] = {
                ...original,
                name: polygonData.name?.trim() || original.name,
                department: polygonData.department?.trim() || original.department,
                employees: polygonData.employees?.trim() || original.employees,
                phone: polygonData.phone?.trim() || original.phone,
                color: polygonData.color || original.color,
                vertices: polygonData.vertices ? Utils.deepCopy(polygonData.vertices) : original.vertices,
                area: polygonData.area || 
                     (polygonData.vertices ? Utils.calculatePolygonArea(polygonData.vertices) : original.area),
                updatedAt: new Date().toISOString()
            };

            this.saveData();
            console.log('Кабинет обновлен:', id);
            return Utils.deepCopy(this.data.rooms[index]);
            
        } catch (error) {
            console.error('Ошибка обновления кабинета:', error);
            throw error;
        }
    }

    deletePolygon(id) {
        try {
            const initialLength = this.data.rooms.length;
            this.data.rooms = this.data.rooms.filter(room => room.id !== id);
            
            if (this.data.rooms.length < initialLength) {
                this.saveData();
                console.log('Кабинет удален:', id);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка удаления кабинета:', error);
            return false;
        }
    }

    clearRooms() {
        try {
            this.data.rooms = [];
            this.saveData();
            console.log('Все кабинеты удалены');
            return true;
        } catch (error) {
            console.error('Ошибка очистки кабинетов:', error);
            return false;
        }
    }

    // ========== МЕТОДЫ ДЛЯ ТОЧЕК ==========
    // (оставляем для обратной совместимости)

    getAllPoints() {
        return Utils.deepCopy(this.data.points);
    }

    getPoint(id) {
        return this.data.points.find(point => point.id === id) || null;
    }

    searchPoints(query) {
        if (!query) return this.getAllPoints();
        
        const lowerQuery = query.toLowerCase();
        return this.data.points.filter(point =>
            point.name.toLowerCase().includes(lowerQuery) ||
            point.type?.toLowerCase().includes(lowerQuery) ||
            point.description?.toLowerCase().includes(lowerQuery)
        );
    }

    addPoint(pointData) {
        try {
            if (!pointData.name || pointData.y === undefined || pointData.x === undefined) {
                throw new Error('Неверные данные точки');
            }

            const point = {
                id: Utils.generateId(),
                name: pointData.name.trim(),
                type: pointData.type?.trim() || '',
                description: pointData.description?.trim() || '',
                color: pointData.color || '#e74c3c',
                y: pointData.y,
                x: pointData.x,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.data.points.push(point);
            
            // Также добавляем как узел графа
            this.addNode({
                id: point.id,
                name: point.name,
                type: point.type === 'door' ? 'door' : 'point_of_interest',
                category: 'point',
                color: point.color,
                y: point.y,
                x: point.x,
                isDraggable: true,
                metadata: {
                    originalPointId: point.id,
                    isRoutingPoint: true,
                    description: point.description || ''
                }
            });
            
            this.saveData();
            
            console.log('Точка добавлена:', point.id, point.name);
            return Utils.deepCopy(point);
            
        } catch (error) {
            console.error('Ошибка добавления точки:', error);
            throw error;
        }
    }

    updatePoint(id, pointData) {
        try {
            const index = this.data.points.findIndex(point => point.id === id);
            if (index === -1) {
                throw new Error('Точка не найдена');
            }

            const original = this.data.points[index];
            
            this.data.points[index] = {
                ...original,
                name: pointData.name?.trim() || original.name,
                type: pointData.type?.trim() || original.type,
                description: pointData.description?.trim() || original.description,
                color: pointData.color || original.color,
                y: pointData.y !== undefined ? pointData.y : original.y,
                x: pointData.x !== undefined ? pointData.x : original.x,
                updatedAt: new Date().toISOString()
            };

            // Также обновляем узел графа
            const nodeIndex = this.data.graphNodes.findIndex(node => node.metadata?.originalPointId === id);
            if (nodeIndex !== -1) {
                this.data.graphNodes[nodeIndex] = {
                    ...this.data.graphNodes[nodeIndex],
                    name: pointData.name?.trim() || original.name,
                    color: pointData.color || original.color,
                    y: pointData.y !== undefined ? pointData.y : original.y,
                    x: pointData.x !== undefined ? pointData.x : original.x,
                    metadata: {
                        ...this.data.graphNodes[nodeIndex].metadata,
                        description: pointData.description?.trim() || original.description || ''
                    }
                };
            }

            this.saveData();
            console.log('Точка обновлена:', id);
            return Utils.deepCopy(this.data.points[index]);
            
        } catch (error) {
            console.error('Ошибка обновления точки:', error);
            throw error;
        }
    }

    deletePoint(id) {
        try {
            const initialLength = this.data.points.length;
            this.data.points = this.data.points.filter(point => point.id !== id);
            
            // Также удаляем связанный узел графа
            this.data.graphNodes = this.data.graphNodes.filter(node => 
                !(node.metadata?.originalPointId === id)
            );
            
            if (this.data.points.length < initialLength) {
                this.saveData();
                console.log('Точка удалена:', id);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка удаления точки:', error);
            return false;
        }
    }

    clearPoints() {
        try {
            this.data.points = [];
            // Не очищаем graphNodes, так как они могут содержать другие типы узлов
            this.saveData();
            console.log('Все точки удалены');
            return true;
        } catch (error) {
            console.error('Ошибка очистки точек:', error);
            return false;
        }
    }

    // ========== МЕТОДЫ ДЛЯ ГРАФА (НОВЫЕ) ==========

    /**
     * Получение всех узлов графа
     * @returns {Array} Массив узлов
     */
    getAllNodes() {
        return Utils.deepCopy(this.data.graphNodes);
    }

    /**
     * Получение узла по ID
     * @param {string} id - ID узла
     * @returns {object|null} Узел
     */
    getNode(id) {
        return this.data.graphNodes.find(node => node.id === id) || null;
    }

    /**
     * Добавление узла в граф
     * @param {object} nodeData - Данные узла
     * @returns {object} Добавленный узел
     */
    addNode(nodeData) {
        try {
            if (!nodeData.y === undefined || !nodeData.x === undefined) {
                throw new Error('Неверные координаты узла');
            }

            const node = {
                id: nodeData.id || Utils.generateId(),
                name: nodeData.name?.trim() || `Узел ${this.data.graphNodes.length + 1}`,
                type: nodeData.type || 'point_of_interest',
                category: nodeData.category || 'point',
                color: nodeData.color || '#3498db',
                y: nodeData.y,
                x: nodeData.x,
                isDraggable: nodeData.isDraggable !== false,
                metadata: {
                    ...nodeData.metadata,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            };

            this.data.graphNodes.push(node);
            this.saveData();
            
            console.log('Узел графа добавлен:', node.id, node.name);
            return Utils.deepCopy(node);
            
        } catch (error) {
            console.error('Ошибка добавления узла графа:', error);
            throw error;
        }
    }

    /**
     * Обновление узла графа
     * @param {string} id - ID узла
     * @param {object} nodeData - Новые данные узла
     * @returns {object} Обновленный узел
     */
    updateNode(id, nodeData) {
        try {
            const index = this.data.graphNodes.findIndex(node => node.id === id);
            if (index === -1) {
                throw new Error('Узел графа не найден');
            }

            const original = this.data.graphNodes[index];
            
            this.data.graphNodes[index] = {
                ...original,
                name: nodeData.name?.trim() || original.name,
                type: nodeData.type || original.type,
                category: nodeData.category || original.category,
                color: nodeData.color || original.color,
                y: nodeData.y !== undefined ? nodeData.y : original.y,
                x: nodeData.x !== undefined ? nodeData.x : original.x,
                isDraggable: nodeData.isDraggable !== undefined ? nodeData.isDraggable : original.isDraggable,
                metadata: {
                    ...original.metadata,
                    ...nodeData.metadata,
                    updatedAt: new Date().toISOString()
                }
            };

            this.saveData();
            console.log('Узел графа обновлен:', id);
            return Utils.deepCopy(this.data.graphNodes[index]);
            
        } catch (error) {
            console.error('Ошибка обновления узла графа:', error);
            throw error;
        }
    }

    /**
     * Удаление узла графа
     * @param {string} id - ID узла
     * @returns {boolean} Успешно ли удалено
     */
    deleteNode(id) {
        try {
            // Удаляем узел
            const initialLength = this.data.graphNodes.length;
            this.data.graphNodes = this.data.graphNodes.filter(node => node.id !== id);
            
            // Удаляем все рёбра, связанные с этим узлом
            this.data.graphEdges = this.data.graphEdges.filter(edge => 
                edge.source !== id && edge.target !== id
            );
            
            if (this.data.graphNodes.length < initialLength) {
                this.saveData();
                console.log('Узел графа удален:', id);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка удаления узла графа:', error);
            return false;
        }
    }

    /**
     * Получение всех рёбер графа
     * @returns {Array} Массив рёбер
     */
    getAllEdges() {
        return Utils.deepCopy(this.data.graphEdges);
    }

    /**
     * Получение ребра по ID
     * @param {string} id - ID ребра
     * @returns {object|null} Ребро
     */
    getEdge(id) {
        return this.data.graphEdges.find(edge => edge.id === id) || null;
    }

    /**
     * Получение рёбер, связанных с узлом
     * @param {string} nodeId - ID узла
     * @returns {Array} Массив рёбер
     */
    getEdgesByNode(nodeId) {
        return this.data.graphEdges.filter(edge => 
            edge.source === nodeId || edge.target === nodeId
        );
    }

    /**
     * Добавление ребра в граф
     * @param {string} sourceId - ID исходного узла
     * @param {string} targetId - ID целевого узла
     * @param {object} edgeData - Данные ребра
     * @returns {object} Добавленное ребро
     */
    addEdge(sourceId, targetId, edgeData = {}) {
        try {
            // Проверяем существование узлов
            const sourceNode = this.getNode(sourceId);
            const targetNode = this.getNode(targetId);
            
            if (!sourceNode || !targetNode) {
                throw new Error('Узлы не найдены');
            }

            // Проверяем, нет ли уже такого ребра
            const existingEdge = this.data.graphEdges.find(edge => 
                (edge.source === sourceId && edge.target === targetId) ||
                (edge.source === targetId && edge.target === sourceId)
            );
            
            if (existingEdge) {
                console.warn('Ребро уже существует:', existingEdge.id);
                return Utils.deepCopy(existingEdge);
            }

            // Рассчитываем длину
            const length = Math.sqrt(
                Math.pow(targetNode.y - sourceNode.y, 2) + 
                Math.pow(targetNode.x - sourceNode.x, 2)
            );

            const edge = {
                id: edgeData.id || Utils.generateId(),
                source: sourceId,
                target: targetId,
                name: edgeData.name || `${sourceNode.name} ↔ ${targetNode.name}`,
                color: edgeData.color || '#2ecc71',
                weight: edgeData.weight || 3,
                length: edgeData.length || length,
                isBidirectional: edgeData.isBidirectional !== false,
                metadata: {
                    ...edgeData.metadata,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            };

            this.data.graphEdges.push(edge);
            this.saveData();
            
            console.log('Ребро графа добавлено:', edge.id, edge.name);
            return Utils.deepCopy(edge);
            
        } catch (error) {
            console.error('Ошибка добавления ребра графа:', error);
            throw error;
        }
    }

    /**
     * Обновление ребра графа
     * @param {string} id - ID ребра
     * @param {object} edgeData - Новые данные ребра
     * @returns {object} Обновленное ребро
     */
    updateEdge(id, edgeData) {
        try {
            const index = this.data.graphEdges.findIndex(edge => edge.id === id);
            if (index === -1) {
                throw new Error('Ребро графа не найден');
            }

            const original = this.data.graphEdges[index];
            
            this.data.graphEdges[index] = {
                ...original,
                name: edgeData.name?.trim() || original.name,
                color: edgeData.color || original.color,
                weight: edgeData.weight || original.weight,
                isBidirectional: edgeData.isBidirectional !== undefined ? edgeData.isBidirectional : original.isBidirectional,
                metadata: {
                    ...original.metadata,
                    ...edgeData.metadata,
                    updatedAt: new Date().toISOString()
                }
            };

            this.saveData();
            console.log('Ребро графа обновлено:', id);
            return Utils.deepCopy(this.data.graphEdges[index]);
            
        } catch (error) {
            console.error('Ошибка обновления ребра графа:', error);
            throw error;
        }
    }

    /**
     * Удаление ребра графа
     * @param {string} id - ID ребра
     * @returns {boolean} Успешно ли удалено
     */
    deleteEdge(id) {
        try {
            const initialLength = this.data.graphEdges.length;
            this.data.graphEdges = this.data.graphEdges.filter(edge => edge.id !== id);
            
            if (this.data.graphEdges.length < initialLength) {
                this.saveData();
                console.log('Ребро графа удалено:', id);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка удаления ребра графа:', error);
            return false;
        }
    }

    /**
     * Очистка всех узлов графа
     * @returns {boolean} Успешно ли очищено
     */
    clearGraphNodes() {
        try {
            this.data.graphNodes = [];
            this.saveData();
            console.log('Все узлы графа удалены');
            return true;
        } catch (error) {
            console.error('Ошибка очистки узлов графа:', error);
            return false;
        }
    }

    /**
     * Очистка всех рёбер графа
     * @returns {boolean} Успешно ли очищено
     */
    clearGraphEdges() {
        try {
            this.data.graphEdges = [];
            this.saveData();
            console.log('Все рёбра графа удалены');
            return true;
        } catch (error) {
            console.error('Ошибка очистки рёбер графа:', error);
            return false;
        }
    }

    // ========== МЕТОДЫ ДЛЯ МАРШРУТОВ ==========
    // (оставляем для обратной совместимости)

    getAllRoutes() {
        return Utils.deepCopy(this.data.routes);
    }

    getRoute(id) {
        return this.data.routes.find(route => route.id === id) || null;
    }

    getRoutesByPoint(pointId) {
        const point = this.getPoint(pointId);
        if (!point) return [];
        
        return this.data.routes.filter(route => 
            route.startPointId === pointId || 
            route.endPointId === pointId ||
            route.points?.some(([y, x]) => y === point.y && x === point.x)
        );
    }

    addRoute(routeData) {
        try {
            if (!routeData.name || !routeData.points || routeData.points.length < 2) {
                throw new Error('Неверные данные маршрута');
            }

            const route = {
                id: Utils.generateId(),
                name: routeData.name.trim(),
                points: Utils.deepCopy(routeData.points),
                color: routeData.color || '#2ecc71',
                weight: routeData.weight || 3,
                startPointId: routeData.startPointId || null,
                endPointId: routeData.endPointId || null,
                startName: routeData.startName || '',
                endName: routeData.endName || '',
                length: routeData.length || this.calculateRouteLength(routeData.points),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.data.routes.push(route);
            this.saveData();
            
            console.log('Маршрут добавлен:', route.id, route.name);
            return Utils.deepCopy(route);
            
        } catch (error) {
            console.error('Ошибка добавления маршрута:', error);
            throw error;
        }
    }

    calculateRouteLength(points) {
        let totalLength = 0;
        for (let i = 0; i < points.length - 1; i++) {
            const [y1, x1] = points[i];
            const [y2, x2] = points[i + 1];
            totalLength += Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
        }
        return totalLength;
    }

    updateRoute(id, routeData) {
        try {
            const index = this.data.routes.findIndex(route => route.id === id);
            if (index === -1) {
                throw new Error('Маршрут не найден');
            }

            const original = this.data.routes[index];
            
            this.data.routes[index] = {
                ...original,
                name: routeData.name?.trim() || original.name,
                points: routeData.points ? Utils.deepCopy(routeData.points) : original.points,
                color: routeData.color || original.color,
                weight: routeData.weight || original.weight,
                startPointId: routeData.startPointId !== undefined ? routeData.startPointId : original.startPointId,
                endPointId: routeData.endPointId !== undefined ? routeData.endPointId : original.endPointId,
                startName: routeData.startName?.trim() || original.startName,
                endName: routeData.endName?.trim() || original.endName,
                length: routeData.length || 
                       (routeData.points ? this.calculateRouteLength(routeData.points) : original.length),
                updatedAt: new Date().toISOString()
            };

            this.saveData();
            console.log('Маршрут обновлен:', id);
            return Utils.deepCopy(this.data.routes[index]);
            
        } catch (error) {
            console.error('Ошибка обновления маршрута:', error);
            throw error;
        }
    }

    deleteRoute(id) {
        try {
            const initialLength = this.data.routes.length;
            this.data.routes = this.data.routes.filter(route => route.id !== id);
            
            if (this.data.routes.length < initialLength) {
                this.saveData();
                console.log('Маршрут удален:', id);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка удаления маршрута:', error);
            return false;
        }
    }

    clearRoutes() {
        try {
            this.data.routes = [];
            this.saveData();
            console.log('Все маршруты удалены');
            return true;
        } catch (error) {
            console.error('Ошибка очистки маршрутов:', error);
            return false;
        }
    }

    // ========== МЕТОДЫ ДЛЯ ТОЧЕК ПРИВЯЗКИ ==========
    // (оставляем для обратной совместимости)

    getAllRoutePoints() {
        return Utils.deepCopy(this.data.routePoints);
    }

    getRoutePoint(id) {
        return this.data.routePoints.find(point => point.id === id) || null;
    }

    addRoutePoint(routePointData) {
        try {
            if (!routePointData.y || !routePointData.x) {
                throw new Error('Неверные координаты точки привязки');
            }

            const routePoint = {
                id: Utils.generateId(),
                name: routePointData.name?.trim() || `Точка ${this.data.routePoints.length + 1}`,
                y: routePointData.y,
                x: routePointData.x,
                color: routePointData.color || '#9b59b6',
                connectedRoutes: routePointData.connectedRoutes || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.data.routePoints.push(routePoint);
            this.saveData();
            
            console.log('Точка привязки добавлена:', routePoint.id);
            return Utils.deepCopy(routePoint);
            
        } catch (error) {
            console.error('Ошибка добавления точки привязки:', error);
            throw error;
        }
    }

    updateRoutePoint(id, routePointData) {
        try {
            const index = this.data.routePoints.findIndex(point => point.id === id);
            if (index === -1) {
                throw new Error('Точка привязки не найдена');
            }

            const original = this.data.routePoints[index];
            
            this.data.routePoints[index] = {
                ...original,
                name: routePointData.name?.trim() || original.name,
                y: routePointData.y !== undefined ? routePointData.y : original.y,
                x: routePointData.x !== undefined ? routePointData.x : original.x,
                color: routePointData.color || original.color,
                connectedRoutes: routePointData.connectedRoutes || original.connectedRoutes,
                updatedAt: new Date().toISOString()
            };

            this.saveData();
            console.log('Точка привязки обновлена:', id);
            return Utils.deepCopy(this.data.routePoints[index]);
            
        } catch (error) {
            console.error('Ошибка обновления точки привязки:', error);
            throw error;
        }
    }

    deleteRoutePoint(id) {
        try {
            const initialLength = this.data.routePoints.length;
            this.data.routePoints = this.data.routePoints.filter(point => point.id !== id);
            
            if (this.data.routePoints.length < initialLength) {
                this.saveData();
                console.log('Точка привязки удалена:', id);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка удаления точки привязки:', error);
            return false;
        }
    }

    // ========== ОБЩИЕ МЕТОДЫ ==========

    clearAll() {
        try {
            this.data = {
                rooms: [],
                points: [],
                routes: [],
                routePoints: [],
                graphNodes: [],
                graphEdges: [],
                metadata: {
                    ...this.data.metadata,
                    lastModified: new Date().toISOString()
                }
            };
            
            this.saveData();
            console.log('Все данные очищены');
            return true;
            
        } catch (error) {
            console.error('Ошибка очистки всех данных:', error);
            return false;
        }
    }

    exportData() {
        try {
            const exportData = {
                ...this.data,
                exportDate: new Date().toISOString(),
                exportVersion: '2.0'
            };
            
            return JSON.stringify(exportData, null, 2);
            
        } catch (error) {
            console.error('Ошибка экспорта данных:', error);
            throw error;
        }
    }

    importData(jsonData) {
        try {
            const importedData = JSON.parse(jsonData);
            
            // Проверяем структуру данных
            if (!importedData.rooms) {
                throw new Error('Неверный формат данных');
            }

            this.data = {
                rooms: importedData.rooms || [],
                points: importedData.points || [],
                routes: importedData.routes || [],
                routePoints: importedData.routePoints || [],
                graphNodes: importedData.graphNodes || [],
                graphEdges: importedData.graphEdges || [],
                metadata: {
                    version: '2.0',
                    lastModified: new Date().toISOString(),
                    created: importedData.metadata?.created || new Date().toISOString()
                }
            };

            this.saveData();
            console.log('Данные успешно импортированы');
            return true;
            
        } catch (error) {
            console.error('Ошибка импорта данных:', error);
            Utils.showNotification('Ошибка импорта данных: ' + error.message, 'error');
            return false;
        }
    }

    getPointsForSelection() {
        return this.data.points.map(point => ({
            id: point.id,
            name: point.name,
            type: point.type,
            y: point.y,
            x: point.x
        }));
    }

    getRoomsForSelection() {
        return this.data.rooms.map(room => ({
            id: room.id,
            name: room.name,
            department: room.department,
            center: Utils.getPolygonCenter(room.vertices)
        }));
    }

    /**
     * Получение узлов для тестирования маршрутов
     * @returns {Array} Массив узлов с маршрутизацией
     */
    getRoutingNodesForSelection() {
        return this.data.graphNodes
            .filter(node => node.metadata?.isRoutingPoint !== false)
            .map(node => ({
                id: node.id,
                name: node.name,
                type: node.type,
                y: node.y,
                x: node.x
            }));
    }

    /**
     * Поиск ближайшего узла к координатам
     * @param {number} y - Координата Y
     * @param {number} x - Координата X
     * @param {number} maxDistance - Максимальное расстояние
     * @returns {object|null} Найденный узел
     */
    findNearestNode(y, x, maxDistance = 50) {
        let nearestNode = null;
        let minDistance = Infinity;

        this.data.graphNodes.forEach(node => {
            const distance = Math.sqrt(
                Math.pow(node.y - y, 2) + Math.pow(node.x - x, 2)
            );
            
            if (distance < minDistance && distance < maxDistance) {
                minDistance = distance;
                nearestNode = node;
            }
        });

        return nearestNode ? Utils.deepCopy(nearestNode) : null;
    }
}

// Экспортируем класс для глобального использования
window.DataManager = DataManager;
