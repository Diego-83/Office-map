/**
 * Менеджер данных - управление хранением и обработкой данных
 * ПОЛНОСТЬЮ ПЕРЕПИСАННАЯ ВЕРСИЯ с гарантированным сохранением данных
 */

class DataManager {
    constructor() {
        console.log('Создание DataManager...');
        
        this.data = {
            rooms: [],
            points: [],
            connections: [],
            imagePath: 'img/plan.png',
            metadata: {
                version: '4.0',
                lastModified: new Date().toISOString(),
                created: new Date().toISOString()
            }
        };
        
        // Кэш для быстрого доступа
        this.cache = {
            rooms: new Map(),
            points: new Map(),
            connections: new Map()
        };
        
        this.loadData();
    }

    // ========== БАЗОВЫЕ МЕТОДЫ ==========

    /**
     * Загрузка данных из localStorage
     */
    loadData() {
        try {
            const savedData = Utils.loadFromLocalStorage('office_map_data');
            if (savedData) {
                this.migrateData(savedData);
                this.updateCache();
                console.log('✅ Данные загружены:', this.getStats());
            } else {
                console.log('📝 Данные не найдены, инициализация пустых');
                this.saveData();
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
        }
    }

    /**
     * Обновление кэша
     */
    updateCache() {
        // Очищаем кэш
        this.cache.rooms.clear();
        this.cache.points.clear();
        this.cache.connections.clear();
        
        // Заполняем кэш
        this.data.rooms.forEach(room => this.cache.rooms.set(room.id, room));
        this.data.points.forEach(point => this.cache.points.set(point.id, point));
        this.data.connections.forEach(conn => this.cache.connections.set(conn.id, conn));
        
        console.log('🔄 Кэш обновлен:', {
            rooms: this.cache.rooms.size,
            points: this.cache.points.size,
            connections: this.cache.connections.size
        });
    }

    /**
     * Сохранение данных
     */
    saveData() {
        try {
            this.data.metadata.lastModified = new Date().toISOString();
            
            // Проверяем целостность данных
            this.validateDataIntegrity();
            
            // Сохраняем
            const success = Utils.saveToLocalStorage('office_map_data', this.data);
            
            if (success) {
                console.log('💾 Данные сохранены:', this.getStats());
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
            return false;
        }
    }

    /**
     * Проверка целостности данных
     */
    validateDataIntegrity() {
        // Удаляем соединения с несуществующими точками
        const before = this.data.connections.length;
        this.data.connections = this.data.connections.filter(conn => {
            const fromExists = this.cache.points.has(conn.from);
            const toExists = this.cache.points.has(conn.to);
            
            if (!fromExists || !toExists) {
                console.warn('⚠️ Удалено поврежденное соединение:', conn.id);
                return false;
            }
            return true;
        });
        
        if (this.data.connections.length !== before) {
            console.warn(`⚠️ Удалено ${before - this.data.connections.length} поврежденных соединений`);
        }
        
        return true;
    }

    /**
     * Миграция данных
     */
    migrateData(savedData) {
        console.log('🔄 Миграция данных из версии:', savedData.metadata?.version || 'старая');
        
        // Мигрируем комнаты
        this.data.rooms = (savedData.rooms || []).map(room => ({
            id: room.id || Utils.generateId(),
            name: room.name || '',
            department: room.department || '',
            employees: room.employees || '',
            phone: room.phone || '',
            color: room.color || '#3498db',
            vertices: room.vertices || [],
            area: room.area || 0,
            createdAt: room.createdAt || new Date().toISOString(),
            updatedAt: room.updatedAt || new Date().toISOString()
        }));

        // Мигрируем точки
        if (savedData.graphNodes) {
            this.data.points = savedData.graphNodes.map(node => ({
                id: node.id || Utils.generateId(),
                name: node.name || '',
                type: node.type === 'door' ? 'entrance' : (node.type || 'point_of_interest'),
                y: node.y || 0,
                x: node.x || 0,
                color: node.color || '#3498db',
                isRouting: node.metadata?.isRoutingPoint !== false,
                roomId: node.metadata?.roomId || null,
                metadata: node.metadata || {},
                createdAt: node.createdAt || new Date().toISOString(),
                updatedAt: node.updatedAt || new Date().toISOString()
            }));
        } else {
            this.data.points = (savedData.points || []).map(point => ({
                id: point.id || Utils.generateId(),
                name: point.name || '',
                type: point.type || 'point_of_interest',
                y: point.y || 0,
                x: point.x || 0,
                color: point.color || '#3498db',
                isRouting: point.isRouting !== false,
                roomId: point.roomId || null,
                metadata: point.metadata || {},
                createdAt: point.createdAt || new Date().toISOString(),
                updatedAt: point.updatedAt || new Date().toISOString()
            }));
        }

        // Мигрируем соединения
        if (savedData.graphEdges) {
            this.data.connections = savedData.graphEdges.map(edge => ({
                id: edge.id || Utils.generateId(),
                from: edge.source || edge.from || '',
                to: edge.target || edge.to || '',
                name: edge.name || '',
                color: edge.color || '#2ecc71',
                weight: edge.weight || 3,
                length: edge.length || 0,
                isBidirectional: edge.isBidirectional !== false,
                metadata: edge.metadata || {},
                createdAt: edge.createdAt || new Date().toISOString(),
                updatedAt: edge.updatedAt || new Date().toISOString()
            }));
        } else {
            this.data.connections = (savedData.connections || []).map(conn => ({
                id: conn.id || Utils.generateId(),
                from: conn.from || '',
                to: conn.to || '',
                name: conn.name || '',
                color: conn.color || '#2ecc71',
                weight: conn.weight || 3,
                length: conn.length || 0,
                isBidirectional: conn.isBidirectional !== false,
                metadata: conn.metadata || {},
                createdAt: conn.createdAt || new Date().toISOString(),
                updatedAt: conn.updatedAt || new Date().toISOString()
            }));
        }

        // Мигрируем путь к изображению
        this.data.imagePath = savedData.imagePath || 'img/plan.png';
        
        // Мигрируем метаданные
        this.data.metadata = {
            version: '4.0',
            lastModified: new Date().toISOString(),
            created: savedData.metadata?.created || new Date().toISOString()
        };

        // Обновляем кэш
        this.updateCache();
        
        console.log('✅ Миграция завершена');
    }

    // ========== МЕТОДЫ ДЛЯ ИЗОБРАЖЕНИЯ ==========

    getImagePath() {
        return this.data.imagePath || 'img/plan.png';
    }

    saveImagePath(path) {
        if (!path) return false;
        this.data.imagePath = path;
        this.saveData();
        console.log('🖼️ Путь к изображению сохранен:', path);
        return true;
    }

    // ========== МЕТОДЫ ДЛЯ КАБИНЕТОВ ==========

    getAllPolygons() {
        return this.data.rooms.map(room => ({ ...room }));
    }

    getPolygon(id) {
        const room = this.cache.rooms.get(id);
        return room ? { ...room } : null;
    }

    getPolygonByName(name) {
        const room = this.data.rooms.find(r => r.name === name);
        return room ? { ...room } : null;
    }

    addPolygon(polygonData) {
        try {
            console.log('➕ Добавление кабинета:', polygonData.name);

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
                vertices: polygonData.vertices.map(v => [v[0], v[1]]),
                area: polygonData.area || Utils.calculatePolygonArea(polygonData.vertices),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.data.rooms.push(polygon);
            this.cache.rooms.set(polygon.id, polygon);
            this.saveData();

            console.log('✅ Кабинет добавлен:', polygon.id, polygon.name);
            return { ...polygon };

        } catch (error) {
            console.error('❌ Ошибка добавления кабинета:', error);
            throw error;
        }
    }

    updatePolygon(id, polygonData) {
        try {
            console.log('🔄 Обновление кабинета:', id);
            console.log('📝 Новые данные:', polygonData);

            const index = this.data.rooms.findIndex(room => room.id === id);
            if (index === -1) {
                throw new Error('Кабинет не найден');
            }

            const original = this.data.rooms[index];
            
            // Создаем обновленный объект
            const updatedRoom = {
                ...original,
                name: polygonData.name?.trim() !== undefined ? polygonData.name.trim() : original.name,
                department: polygonData.department?.trim() !== undefined ? polygonData.department.trim() : original.department,
                employees: polygonData.employees?.trim() !== undefined ? polygonData.employees.trim() : original.employees,
                phone: polygonData.phone?.trim() !== undefined ? polygonData.phone.trim() : original.phone,
                color: polygonData.color || original.color,
                vertices: polygonData.vertices ? polygonData.vertices.map(v => [v[0], v[1]]) : original.vertices,
                area: polygonData.area || 
                     (polygonData.vertices ? Utils.calculatePolygonArea(polygonData.vertices) : original.area),
                updatedAt: new Date().toISOString()
            };

            // Обновляем в массиве
            this.data.rooms[index] = updatedRoom;
            
            // Обновляем в кэше
            this.cache.rooms.set(id, updatedRoom);
            
            // Сохраняем
            this.saveData();

            console.log('✅ Кабинет обновлен:', {
                id: updatedRoom.id,
                name: updatedRoom.name,
                department: updatedRoom.department,
                employees: updatedRoom.employees,
                phone: updatedRoom.phone,
                color: updatedRoom.color
            });

            return { ...updatedRoom };

        } catch (error) {
            console.error('❌ Ошибка обновления кабинета:', error);
            throw error;
        }
    }

    deletePolygon(id) {
        try {
            console.log('🗑️ Удаление кабинета:', id);

            // Отвязываем точки
            this.data.points = this.data.points.map(point => {
                if (point.roomId === id) {
                    const updated = { ...point, roomId: null, updatedAt: new Date().toISOString() };
                    this.cache.points.set(point.id, updated);
                    return updated;
                }
                return point;
            });

            // Удаляем кабинет
            const initialLength = this.data.rooms.length;
            this.data.rooms = this.data.rooms.filter(room => room.id !== id);
            this.cache.rooms.delete(id);

            if (this.data.rooms.length < initialLength) {
                this.saveData();
                console.log('✅ Кабинет удален:', id);
                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ Ошибка удаления кабинета:', error);
            return false;
        }
    }

    clearRooms() {
        try {
            console.log('🗑️ Очистка всех кабинетов');

            // Отвязываем все точки
            this.data.points = this.data.points.map(point => {
                const updated = { ...point, roomId: null, updatedAt: new Date().toISOString() };
                this.cache.points.set(point.id, updated);
                return updated;
            });

            // Очищаем кабинеты
            this.data.rooms = [];
            this.cache.rooms.clear();
            
            this.saveData();
            console.log('✅ Все кабинеты удалены');
            return true;

        } catch (error) {
            console.error('❌ Ошибка очистки кабинетов:', error);
            return false;
        }
    }

    // ========== МЕТОДЫ ДЛЯ ТОЧЕК ==========

    getAllPoints() {
        return this.data.points.map(point => ({ ...point }));
    }

    getPoint(id) {
        const point = this.cache.points.get(id);
        return point ? { ...point } : null;
    }

    getPointsByRoom(roomId) {
        return this.data.points
            .filter(point => point.roomId === roomId)
            .map(point => ({ ...point }));
    }

    getRoutingPoints() {
        return this.data.points
            .filter(point => point.isRouting !== false)
            .map(point => ({ ...point }));
    }

    getPointsByType(type) {
        return this.data.points
            .filter(point => point.type === type)
            .map(point => ({ ...point }));
    }

    addPoint(pointData) {
        try {
            console.log('➕ Добавление точки:', pointData.name);

            if (!pointData.name || pointData.y === undefined || pointData.x === undefined) {
                throw new Error('Неверные данные точки');
            }

            const point = {
                id: pointData.id || Utils.generateId(),
                name: pointData.name.trim(),
                type: pointData.type || 'point_of_interest',
                y: pointData.y,
                x: pointData.x,
                color: pointData.color || '#3498db',
                isRouting: pointData.isRouting !== false,
                roomId: pointData.roomId || null,
                metadata: pointData.metadata || {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.data.points.push(point);
            this.cache.points.set(point.id, point);
            this.saveData();

            console.log('✅ Точка добавлена:', point.id, point.name);
            return { ...point };

        } catch (error) {
            console.error('❌ Ошибка добавления точки:', error);
            throw error;
        }
    }

    updatePoint(id, pointData) {
        try {
            console.log('🔄 Обновление точки:', id);

            const index = this.data.points.findIndex(point => point.id === id);
            if (index === -1) {
                throw new Error('Точка не найдена');
            }

            const original = this.data.points[index];
            
            const updatedPoint = {
                ...original,
                name: pointData.name?.trim() !== undefined ? pointData.name.trim() : original.name,
                type: pointData.type || original.type,
                y: pointData.y !== undefined ? pointData.y : original.y,
                x: pointData.x !== undefined ? pointData.x : original.x,
                color: pointData.color || original.color,
                isRouting: pointData.isRouting !== undefined ? pointData.isRouting : original.isRouting,
                roomId: pointData.roomId !== undefined ? pointData.roomId : original.roomId,
                metadata: {
                    ...original.metadata,
                    ...pointData.metadata
                },
                updatedAt: new Date().toISOString()
            };

            this.data.points[index] = updatedPoint;
            this.cache.points.set(id, updatedPoint);
            
            // Обновляем связанные соединения
            this.updateConnectionsForPoint(id, updatedPoint);
            
            this.saveData();

            console.log('✅ Точка обновлена:', id);
            return { ...updatedPoint };

        } catch (error) {
            console.error('❌ Ошибка обновления точки:', error);
            throw error;
        }
    }

    updateConnectionsForPoint(pointId, updatedPoint) {
        // Обновляем длину соединений, связанных с этой точкой
        this.data.connections = this.data.connections.map(conn => {
            if (conn.from === pointId || conn.to === pointId) {
                const otherId = conn.from === pointId ? conn.to : conn.from;
                const otherPoint = this.cache.points.get(otherId);
                
                if (otherPoint) {
                    const length = Math.sqrt(
                        Math.pow(otherPoint.y - updatedPoint.y, 2) + 
                        Math.pow(otherPoint.x - updatedPoint.x, 2)
                    );
                    
                    const updated = {
                        ...conn,
                        length: length,
                        updatedAt: new Date().toISOString()
                    };
                    
                    this.cache.connections.set(conn.id, updated);
                    return updated;
                }
            }
            return conn;
        });
    }

    deletePoint(id) {
        try {
            console.log('🗑️ Удаление точки:', id);

            // Удаляем связанные соединения
            this.data.connections = this.data.connections.filter(conn => {
                if (conn.from === id || conn.to === id) {
                    this.cache.connections.delete(conn.id);
                    return false;
                }
                return true;
            });

            // Удаляем точку
            const initialLength = this.data.points.length;
            this.data.points = this.data.points.filter(point => point.id !== id);
            this.cache.points.delete(id);

            if (this.data.points.length < initialLength) {
                this.saveData();
                console.log('✅ Точка удалена:', id);
                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ Ошибка удаления точки:', error);
            return false;
        }
    }

    clearPoints() {
        try {
            console.log('🗑️ Очистка всех точек');
            this.data.points = [];
            this.data.connections = [];
            this.cache.points.clear();
            this.cache.connections.clear();
            this.saveData();
            console.log('✅ Все точки и соединения удалены');
            return true;
        } catch (error) {
            console.error('❌ Ошибка очистки точек:', error);
            return false;
        }
    }

    findNearestPoint(y, x, maxDistance = 50) {
        let nearest = null;
        let minDistance = Infinity;

        this.data.points.forEach(point => {
            const distance = Math.sqrt(
                Math.pow(point.y - y, 2) + Math.pow(point.x - x, 2)
            );
            
            if (distance < minDistance && distance < maxDistance) {
                minDistance = distance;
                nearest = point;
            }
        });

        return nearest ? { ...nearest } : null;
    }

    attachPointToRoom(pointId, roomId) {
        try {
            const point = this.getPoint(pointId);
            const room = this.getPolygon(roomId);
            
            if (!point) throw new Error('Точка не найдена');
            if (roomId && !room) throw new Error('Кабинет не найден');
            
            return this.updatePoint(pointId, { roomId: roomId || null });

        } catch (error) {
            console.error('❌ Ошибка привязки точки к кабинету:', error);
            throw error;
        }
    }

    getRoomForPoint(pointId) {
        const point = this.getPoint(pointId);
        if (!point || !point.roomId) return null;
        return this.getPolygon(point.roomId);
    }

    // ========== МЕТОДЫ ДЛЯ СОЕДИНЕНИЙ ==========

    getAllConnections() {
        return this.data.connections.map(conn => ({ ...conn }));
    }

    getConnection(id) {
        const conn = this.cache.connections.get(id);
        return conn ? { ...conn } : null;
    }

    getConnectionsByPoint(pointId) {
        return this.data.connections
            .filter(conn => conn.from === pointId || conn.to === pointId)
            .map(conn => ({ ...conn }));
    }

    addConnection(fromId, toId, connectionData = {}) {
        try {
            console.log('➕ Добавление соединения:', fromId, '↔', toId);

            const fromPoint = this.getPoint(fromId);
            const toPoint = this.getPoint(toId);
            
            if (!fromPoint) throw new Error('Точка отправления не найдена');
            if (!toPoint) throw new Error('Точка назначения не найдена');

            // Проверяем существующее соединение
            const existing = this.data.connections.find(conn => 
                (conn.from === fromId && conn.to === toId) ||
                (conn.from === toId && conn.to === fromId)
            );
            
            if (existing) {
                console.log('⚠️ Соединение уже существует:', existing.id);
                return { ...existing };
            }

            const length = Math.sqrt(
                Math.pow(toPoint.y - fromPoint.y, 2) + 
                Math.pow(toPoint.x - fromPoint.x, 2)
            );

            const connection = {
                id: connectionData.id || Utils.generateId(),
                from: fromId,
                to: toId,
                name: connectionData.name || `${fromPoint.name} ↔ ${toPoint.name}`,
                color: connectionData.color || '#2ecc71',
                weight: connectionData.weight || 3,
                length: connectionData.length || length,
                isBidirectional: connectionData.isBidirectional !== false,
                metadata: connectionData.metadata || {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.data.connections.push(connection);
            this.cache.connections.set(connection.id, connection);
            this.saveData();

            console.log('✅ Соединение добавлено:', connection.id);
            return { ...connection };

        } catch (error) {
            console.error('❌ Ошибка добавления соединения:', error);
            throw error;
        }
    }

    updateConnection(id, connectionData) {
        try {
            console.log('🔄 Обновление соединения:', id);

            const index = this.data.connections.findIndex(conn => conn.id === id);
            if (index === -1) {
                throw new Error('Соединение не найдено');
            }

            const original = this.data.connections[index];
            
            // Пересчитываем длину если меняются точки
            let newLength = original.length;
            if (connectionData.from || connectionData.to) {
                const fromId = connectionData.from || original.from;
                const toId = connectionData.to || original.to;
                const fromPoint = this.getPoint(fromId);
                const toPoint = this.getPoint(toId);
                
                if (fromPoint && toPoint) {
                    newLength = Math.sqrt(
                        Math.pow(toPoint.y - fromPoint.y, 2) + 
                        Math.pow(toPoint.x - fromPoint.x, 2)
                    );
                }
            }

            const updated = {
                ...original,
                from: connectionData.from !== undefined ? connectionData.from : original.from,
                to: connectionData.to !== undefined ? connectionData.to : original.to,
                name: connectionData.name?.trim() || original.name,
                color: connectionData.color || original.color,
                weight: connectionData.weight || original.weight,
                length: newLength,
                isBidirectional: connectionData.isBidirectional !== undefined ? connectionData.isBidirectional : original.isBidirectional,
                metadata: {
                    ...original.metadata,
                    ...connectionData.metadata
                },
                updatedAt: new Date().toISOString()
            };

            this.data.connections[index] = updated;
            this.cache.connections.set(id, updated);
            this.saveData();

            console.log('✅ Соединение обновлено:', id);
            return { ...updated };

        } catch (error) {
            console.error('❌ Ошибка обновления соединения:', error);
            throw error;
        }
    }

    deleteConnection(id) {
        try {
            console.log('🗑️ Удаление соединения:', id);

            const initialLength = this.data.connections.length;
            this.data.connections = this.data.connections.filter(conn => conn.id !== id);
            this.cache.connections.delete(id);

            if (this.data.connections.length < initialLength) {
                this.saveData();
                console.log('✅ Соединение удалено:', id);
                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ Ошибка удаления соединения:', error);
            return false;
        }
    }

    clearConnections() {
        try {
            console.log('🗑️ Очистка всех соединений');
            this.data.connections = [];
            this.cache.connections.clear();
            this.saveData();
            console.log('✅ Все соединения удалены');
            return true;
        } catch (error) {
            console.error('❌ Ошибка очистки соединений:', error);
            return false;
        }
    }

    // ========== ОБЩИЕ МЕТОДЫ ==========

    getData() {
        return {
            rooms: this.data.rooms.map(r => ({ ...r })),
            points: this.data.points.map(p => ({ ...p })),
            connections: this.data.connections.map(c => ({ ...c })),
            imagePath: this.data.imagePath,
            metadata: { ...this.data.metadata }
        };
    }

    getStats() {
        const routingPoints = this.data.points.filter(p => p.isRouting !== false).length;
        const pointsWithRooms = this.data.points.filter(p => p.roomId).length;
        
        return {
            rooms: this.data.rooms.length,
            points: this.data.points.length,
            routingPoints,
            pointsWithRooms,
            connections: this.data.connections.length,
            imagePath: this.data.imagePath,
            total: this.data.rooms.length + this.data.points.length + this.data.connections.length
        };
    }

    clearAll() {
        try {
            console.log('🗑️ Очистка всех данных');
            
            this.data = {
                rooms: [],
                points: [],
                connections: [],
                imagePath: 'img/plan.png',
                metadata: {
                    version: '4.0',
                    lastModified: new Date().toISOString(),
                    created: this.data.metadata?.created || new Date().toISOString()
                }
            };

            this.cache.rooms.clear();
            this.cache.points.clear();
            this.cache.connections.clear();
            
            this.saveData();
            console.log('✅ Все данные очищены');
            return true;

        } catch (error) {
            console.error('❌ Ошибка очистки всех данных:', error);
            return false;
        }
    }

    exportData() {
        try {
            const exportData = {
                ...this.data,
                exportDate: new Date().toISOString(),
                exportVersion: '4.0'
            };
            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('❌ Ошибка экспорта данных:', error);
            throw error;
        }
    }

    importData(jsonData) {
        try {
            console.log('📥 Импорт данных...');
            
            const importedData = JSON.parse(jsonData);
            
            if (!importedData.rooms) {
                throw new Error('Неверный формат данных');
            }

            this.data = {
                rooms: importedData.rooms || [],
                points: importedData.points || [],
                connections: importedData.connections || [],
                imagePath: importedData.imagePath || 'img/plan.png',
                metadata: {
                    version: '4.0',
                    lastModified: new Date().toISOString(),
                    created: importedData.metadata?.created || new Date().toISOString()
                }
            };

            this.updateCache();
            this.validateDataIntegrity();
            this.saveData();

            console.log('✅ Данные успешно импортированы');
            return true;

        } catch (error) {
            console.error('❌ Ошибка импорта данных:', error);
            Utils.showNotification('Ошибка импорта данных: ' + error.message, 'error');
            return false;
        }
    }

    findPointsInPolygon(vertices) {
        return this.data.points
            .filter(point => Utils.isPointInPolygon([point.y, point.x], vertices))
            .map(point => ({ ...point }));
    }

    findNearestRoomToPoint(y, x, maxDistance = 100) {
        let nearest = null;
        let minDistance = Infinity;

        this.data.rooms.forEach(room => {
            if (room.vertices && room.vertices.length >= 3) {
                const center = Utils.getPolygonCenter(room.vertices);
                const distance = Math.sqrt(
                    Math.pow(center[0] - y, 2) + Math.pow(center[1] - x, 2)
                );
                
                if (distance < minDistance && distance < maxDistance) {
                    minDistance = distance;
                    nearest = room;
                }
            }
        });

        return nearest ? { ...nearest } : null;
    }

    pointExists(pointId) {
        return this.cache.points.has(pointId);
    }

    connectionExists(fromId, toId) {
        return this.data.connections.some(conn => 
            (conn.from === fromId && conn.to === toId) ||
            (conn.from === toId && conn.to === fromId)
        );
    }

    getGraph() {
        const graph = {};
        
        this.data.points.forEach(point => {
            if (point.isRouting !== false) {
                graph[point.id] = [];
            }
        });
        
        this.data.connections.forEach(conn => {
            if (graph[conn.from] && graph[conn.to]) {
                graph[conn.from].push({
                    node: conn.to,
                    length: conn.length,
                    connection: { ...conn }
                });
                
                if (conn.isBidirectional) {
                    graph[conn.to].push({
                        node: conn.from,
                        length: conn.length,
                        connection: { ...conn }
                    });
                }
            }
        });
        
        return graph;
    }
}

// Экспортируем класс
window.DataManager = DataManager;
