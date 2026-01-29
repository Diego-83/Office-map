/**
 * Логика графа маршрутизации
 */

class RoutingGraph {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.nodes = new Map();    // Map<id, Node>
        this.edges = new Map();    // Map<id, Edge>
        this.adjacencyList = new Map(); // Map<id, Set<neighborId>>
        this.init();
    }

    /**
     * Инициализация графа
     */
    init() {
        console.log('Инициализация графа маршрутизации...');
        this.buildFromData();
    }

    /**
     * Построение графа из данных DataManager
     */
    buildFromData() {
        // Загружаем узлы
        const nodes = this.dataManager.getAllNodes();
        nodes.forEach(node => {
            this.addNode(node);
        });

        // Загружаем рёбра
        const edges = this.dataManager.getAllEdges();
        edges.forEach(edge => {
            this.addEdge(edge);
        });

        console.log('Граф построен:', {
            nodes: this.nodes.size,
            edges: this.edges.size
        });
    }

    /**
     * Добавление узла
     * @param {object} nodeData - Данные узла
     */
    addNode(nodeData) {
        const node = {
            id: nodeData.id,
            name: nodeData.name,
            type: nodeData.type,
            category: nodeData.category,
            color: nodeData.color,
            y: nodeData.y,
            x: nodeData.x,
            isDraggable: nodeData.isDraggable,
            metadata: nodeData.metadata || {}
        };

        this.nodes.set(node.id, node);
        this.adjacencyList.set(node.id, new Set());
        return node;
    }

    /**
     * Добавление ребра
     * @param {object} edgeData - Данные ребра
     */
    addEdge(edgeData) {
        const edge = {
            id: edgeData.id,
            source: edgeData.source,
            target: edgeData.target,
            name: edgeData.name,
            color: edgeData.color,
            weight: edgeData.weight,
            length: edgeData.length,
            isBidirectional: edgeData.isBidirectional,
            metadata: edgeData.metadata || {}
        };

        this.edges.set(edge.id, edge);
        
        // Добавляем в список смежности
        if (this.adjacencyList.has(edge.source)) {
            this.adjacencyList.get(edge.source).add({
                nodeId: edge.target,
                edgeId: edge.id,
                weight: edge.length
            });
        }

        if (edge.isBidirectional && this.adjacencyList.has(edge.target)) {
            this.adjacencyList.get(edge.target).add({
                nodeId: edge.source,
                edgeId: edge.id,
                weight: edge.length
            });
        }

        return edge;
    }

    /**
     * Получение узла
     * @param {string} nodeId - ID узла
     * @returns {object|null} Узел
     */
    getNode(nodeId) {
        return this.nodes.get(nodeId) || null;
    }

    /**
     * Получение ребра
     * @param {string} edgeId - ID ребра
     * @returns {object|null} Ребро
     */
    getEdge(edgeId) {
        return this.edges.get(edgeId) || null;
    }

    /**
     * Получение соседей узла
     * @param {string} nodeId - ID узла
     * @returns {Array} Массив соседей
     */
    getNeighbors(nodeId) {
        const neighbors = this.adjacencyList.get(nodeId);
        return neighbors ? Array.from(neighbors) : [];
    }

    /**
     * Получение рёбер, связанных с узлом
     * @param {string} nodeId - ID узла
     * @returns {Array} Массив рёбер
     */
    getEdgesByNode(nodeId) {
        const edges = [];
        this.edges.forEach((edge, edgeId) => {
            if (edge.source === nodeId || edge.target === nodeId) {
                edges.push(edge);
            }
        });
        return edges;
    }

    /**
     * Удаление узла
     * @param {string} nodeId - ID узла
     */
    removeNode(nodeId) {
        // Удаляем все рёбра, связанные с узлом
        const edgesToRemove = [];
        this.edges.forEach((edge, edgeId) => {
            if (edge.source === nodeId || edge.target === nodeId) {
                edgesToRemove.push(edgeId);
            }
        });

        edgesToRemove.forEach(edgeId => {
            this.removeEdge(edgeId);
        });

        // Удаляем узел
        this.nodes.delete(nodeId);
        this.adjacencyList.delete(nodeId);
    }

    /**
     * Удаление ребра
     * @param {string} edgeId - ID ребра
     */
    removeEdge(edgeId) {
        const edge = this.edges.get(edgeId);
        if (!edge) return;

        // Удаляем из списка смежности
        if (this.adjacencyList.has(edge.source)) {
            const sourceNeighbors = this.adjacencyList.get(edge.source);
            for (const neighbor of sourceNeighbors) {
                if (neighbor.edgeId === edgeId) {
                    sourceNeighbors.delete(neighbor);
                    break;
                }
            }
        }

        if (edge.isBidirectional && this.adjacencyList.has(edge.target)) {
            const targetNeighbors = this.adjacencyList.get(edge.target);
            for (const neighbor of targetNeighbors) {
                if (neighbor.edgeId === edgeId) {
                    targetNeighbors.delete(neighbor);
                    break;
                }
            }
        }

        // Удаляем ребро
        this.edges.delete(edgeId);
    }

    /**
     * Обновление позиции узла
     * @param {string} nodeId - ID узла
     * @param {number} y - Новая координата Y
     * @param {number} x - Новая координата X
     */
    updateNodePosition(nodeId, y, x) {
        const node = this.getNode(nodeId);
        if (!node) return;

        // Обновляем координаты узла
        node.y = y;
        node.x = x;
        node.metadata.updatedAt = new Date().toISOString();

        // Пересчитываем длины всех связанных рёбер
        this.getNeighbors(nodeId).forEach(neighbor => {
            const edge = this.getEdge(neighbor.edgeId);
            if (edge) {
                const otherNode = this.getNode(
                    edge.source === nodeId ? edge.target : edge.source
                );
                if (otherNode) {
                    edge.length = this.calculateDistance(node, otherNode);
                    
                    // Обновляем вес в списке смежности
                    neighbor.weight = edge.length;
                }
            }
        });
    }

    /**
     * Расчет расстояния между двумя узлами
     * @param {object} node1 - Первый узел
     * @param {object} node2 - Второй узел
     * @returns {number} Расстояние
     */
    calculateDistance(node1, node2) {
        return Math.sqrt(
            Math.pow(node2.y - node1.y, 2) + 
            Math.pow(node2.x - node1.x, 2)
        );
    }

    /**
     * Поиск кратчайшего пути (алгоритм Дейкстры)
     * @param {string} startNodeId - ID начального узла
     * @param {string} endNodeId - ID конечного узла
     * @returns {object} Результат поиска пути
     */
    findShortestPath(startNodeId, endNodeId) {
        console.log('Поиск пути:', startNodeId, '->', endNodeId);

        // Проверяем существование узлов
        if (!this.nodes.has(startNodeId) || !this.nodes.has(endNodeId)) {
            return {
                success: false,
                message: 'Узлы не найдены'
            };
        }

        if (startNodeId === endNodeId) {
            return {
                success: true,
                path: [startNodeId],
                edges: [],
                length: 0,
                nodes: [this.getNode(startNodeId)]
            };
        }

        // Инициализация
        const distances = new Map();
        const previous = new Map();
        const visited = new Set();
        const priorityQueue = new Set();

        // Устанавливаем начальные значения
        this.nodes.forEach((node, id) => {
            distances.set(id, Infinity);
            previous.set(id, null);
            priorityQueue.add(id);
        });

        distances.set(startNodeId, 0);
        const startTime = performance.now();

        // Основной цикл алгоритма Дейкстры
        while (priorityQueue.size > 0) {
            // Находим узел с минимальным расстоянием
            let currentNodeId = null;
            let minDistance = Infinity;

            for (const nodeId of priorityQueue) {
                const dist = distances.get(nodeId);
                if (dist < minDistance) {
                    minDistance = dist;
                    currentNodeId = nodeId;
                }
            }

            // Если не нашли узел или достигли конечного узла
            if (currentNodeId === null || currentNodeId === endNodeId) {
                break;
            }

            priorityQueue.delete(currentNodeId);
            visited.add(currentNodeId);

            // Обрабатываем соседей
            const neighbors = this.getNeighbors(currentNodeId);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor.nodeId)) {
                    const alt = distances.get(currentNodeId) + neighbor.weight;
                    
                    if (alt < distances.get(neighbor.nodeId)) {
                        distances.set(neighbor.nodeId, alt);
                        previous.set(neighbor.nodeId, {
                            nodeId: currentNodeId,
                            edgeId: neighbor.edgeId
                        });
                    }
                }
            }
        }

        // Восстанавливаем путь
        const path = [];
        const edges = [];
        const nodes = [];
        let currentNodeId = endNodeId;
        let totalLength = 0;

        while (currentNodeId !== null && previous.get(currentNodeId) !== null) {
            const prev = previous.get(currentNodeId);
            path.unshift(currentNodeId);
            
            const edge = this.getEdge(prev.edgeId);
            if (edge) {
                edges.unshift(edge);
                totalLength += edge.length;
            }

            const node = this.getNode(currentNodeId);
            if (node) {
                nodes.unshift(node);
            }

            currentNodeId = prev.nodeId;
        }

        // Добавляем начальный узел
        if (currentNodeId === startNodeId) {
            path.unshift(startNodeId);
            
            const startNode = this.getNode(startNodeId);
            if (startNode) {
                nodes.unshift(startNode);
            }

            const endTime = performance.now();
            const searchTime = endTime - startTime;

            return {
                success: true,
                path: path,
                edges: edges.map(e => e.id),
                nodes: nodes,
                length: totalLength,
                searchTime: searchTime,
                startNode: this.getNode(startNodeId),
                endNode: this.getNode(endNodeId)
            };
        }

        return {
            success: false,
            message: 'Путь не найден',
            searchTime: performance.now() - startTime
        };
    }

    /**
     * Поиск всех путей между узлами (для отладки)
     * @param {string} startNodeId - ID начального узла
     * @param {string} endNodeId - ID конечного узла
     * @param {number} maxDepth - Максимальная глубина поиска
     * @returns {Array} Все найденные пути
     */
    findAllPaths(startNodeId, endNodeId, maxDepth = 10) {
        const paths = [];
        const visited = new Set();
        
        const dfs = (currentNodeId, currentPath, currentEdges, depth) => {
            if (depth > maxDepth) return;
            if (currentNodeId === endNodeId) {
                paths.push({
                    path: [...currentPath, currentNodeId],
                    edges: [...currentEdges],
                    length: this.calculatePathLength(currentEdges)
                });
                return;
            }

            visited.add(currentNodeId);
            
            const neighbors = this.getNeighbors(currentNodeId);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor.nodeId)) {
                    const edge = this.getEdge(neighbor.edgeId);
                    if (edge) {
                        dfs(
                            neighbor.nodeId,
                            [...currentPath, currentNodeId],
                            [...currentEdges, edge],
                            depth + 1
                        );
                    }
                }
            }
            
            visited.delete(currentNodeId);
        };

        dfs(startNodeId, [], [], 0);
        
        // Сортируем по длине
        paths.sort((a, b) => a.length - b.length);
        
        return paths;
    }

    /**
     * Расчет длины пути
     * @param {Array} edges - Массив рёбер
     * @returns {number} Длина пути
     */
    calculatePathLength(edges) {
        return edges.reduce((total, edge) => total + edge.length, 0);
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

        this.nodes.forEach(node => {
            const distance = Math.sqrt(
                Math.pow(node.y - y, 2) + Math.pow(node.x - x, 2)
            );
            
            if (distance < minDistance && distance < maxDistance) {
                minDistance = distance;
                nearestNode = node;
            }
        });

        return nearestNode;
    }

    /**
     * Создание нового узла
     * @param {number} y - Координата Y
     * @param {number} x - Координата X
     * @param {object} options - Дополнительные параметры
     * @returns {object} Созданный узел
     */
    createNode(y, x, options = {}) {
        const nodeData = {
            id: options.id || Utils.generateId(),
            name: options.name || `Узел ${this.nodes.size + 1}`,
            type: options.type || 'custom',
            category: options.category || 'point',
            color: options.color || '#3498db',
            y: y,
            x: x,
            isDraggable: options.isDraggable !== false,
            metadata: options.metadata || {}
        };
        
        // Добавляем в граф
        const node = this.addNode(nodeData);
        
        return node;
    }

    /**
     * Создание нового ребра
     * @param {string} sourceNodeId - ID исходного узла
     * @param {string} targetNodeId - ID целевого узла
     * @param {object} options - Дополнительные параметры
     * @returns {object} Созданное ребро
     */
    createEdge(sourceNodeId, targetNodeId, options = {}) {
        const sourceNode = this.getNode(sourceNodeId);
        const targetNode = this.getNode(targetNodeId);
        
        if (!sourceNode || !targetNode) {
            throw new Error('Узлы не найдены');
        }

        const edgeData = {
            id: options.id || Utils.generateId(),
            source: sourceNodeId,
            target: targetNodeId,
            name: options.name || `${sourceNode.name} → ${targetNode.name}`,
            color: options.color || '#2ecc71',
            weight: options.weight || 3,
            isBidirectional: options.isBidirectional !== false,
            metadata: options.metadata || {}
        };
        
        // Рассчитываем длину
        edgeData.length = options.length || this.calculateDistance(sourceNode, targetNode);
        
        // Добавляем в граф
        const edge = this.addEdge(edgeData);
        
        return edge;
    }

    /**
     * Автоматическое создание графа на основе кабинетов
     * @param {Array} rooms - Массив кабинетов
     */
    createGraphFromRooms(rooms) {
        console.log('Создание графа из кабинетов:', rooms.length);
        
        // Очищаем существующий граф
        this.clear();
        
        // Создаём узлы в центрах кабинетов
        rooms.forEach(room => {
            if (room.vertices && room.vertices.length >= 3) {
                const center = Utils.getPolygonCenter(room.vertices);
                this.createNode(center[0], center[1], {
                    name: room.name,
                    type: 'room-center',
                    category: 'room',
                    color: room.color,
                    metadata: {
                        roomId: room.id,
                        originalRoom: room
                    }
                });
            }
        });

        // Создаём соединения между ближайшими кабинетами
        const nodes = Array.from(this.nodes.values());
        
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const node1 = nodes[i];
                const node2 = nodes[j];
                
                const distance = this.calculateDistance(node1, node2);
                
                // Создаём соединение если кабинеты достаточно близко
                if (distance < 200) { // Максимальное расстояние для соединения
                    this.createEdge(node1.id, node2.id, {
                        name: `${node1.name} ↔ ${node2.name}`,
                        length: distance
                    });
                }
            }
        }

        console.log('Автоматический граф создан:', {
            nodes: this.nodes.size,
            edges: this.edges.size
        });
    }

    /**
     * Очистка графа
     */
    clear() {
        this.nodes.clear();
        this.edges.clear();
        this.adjacencyList.clear();
    }

    /**
     * Получение статистики графа
     * @returns {object} Статистика
     */
    getStats() {
        let totalEdgeLength = 0;
        this.edges.forEach(edge => {
            totalEdgeLength += edge.length;
        });

        return {
            nodes: this.nodes.size,
            edges: this.edges.size,
            totalEdgeLength: Math.round(totalEdgeLength),
            averageDegree: this.calculateAverageDegree(),
            connectivity: this.calculateConnectivity()
        };
    }

    /**
     * Расчет средней степени узлов
     * @returns {number} Средняя степень
     */
    calculateAverageDegree() {
        if (this.nodes.size === 0) return 0;
        
        let totalDegree = 0;
        this.adjacencyList.forEach(neighbors => {
            totalDegree += neighbors.size;
        });
        
        return totalDegree / this.nodes.size;
    }

    /**
     * Расчет связности графа
     * @returns {number} Процент связных узлов
     */
    calculateConnectivity() {
        if (this.nodes.size === 0) return 0;
        
        const visited = new Set();
        const nodeIds = Array.from(this.nodes.keys());
        
        // Обход в глубину от первого узла
        const stack = [nodeIds[0]];
        while (stack.length > 0) {
            const currentNodeId = stack.pop();
            if (!visited.has(currentNodeId)) {
                visited.add(currentNodeId);
                const neighbors = this.getNeighbors(currentNodeId);
                neighbors.forEach(neighbor => {
                    if (!visited.has(neighbor.nodeId)) {
                        stack.push(neighbor.nodeId);
                    }
                });
            }
        }
        
        return (visited.size / this.nodes.size) * 100;
    }

    /**
     * Валидация графа
     * @returns {object} Результаты валидации
     */
    validate() {
        const issues = [];
        
        // Проверяем узлы без соединений
        this.nodes.forEach((node, nodeId) => {
            const neighbors = this.adjacencyList.get(nodeId);
            if (!neighbors || neighbors.size === 0) {
                issues.push({
                    type: 'isolated_node',
                    nodeId: nodeId,
                    nodeName: node.name,
                    message: 'Узел не имеет соединений'
                });
            }
        });
        
        // Проверяем рёбра с нулевой длиной
        this.edges.forEach((edge, edgeId) => {
            if (edge.length === 0) {
                issues.push({
                    type: 'zero_length_edge',
                    edgeId: edgeId,
                    edgeName: edge.name,
                    message: 'Ребро имеет нулевую длину'
                });
            }
        });
        
        // Проверяем узлы с одинаковыми координаты
        const coordinateMap = new Map();
        this.nodes.forEach((node, nodeId) => {
            const key = `${node.y},${node.x}`;
            if (coordinateMap.has(key)) {
                issues.push({
                    type: 'duplicate_coordinates',
                    nodeId: nodeId,
                    nodeName: node.name,
                    otherNodeId: coordinateMap.get(key),
                    message: 'Узел имеет такие же координаты, как другой узел'
                });
            } else {
                coordinateMap.set(key, nodeId);
            }
        });
        
        return {
            isValid: issues.length === 0,
            issues: issues,
            summary: {
                totalNodes: this.nodes.size,
                totalEdges: this.edges.size,
                issueCount: issues.length
            }
        };
    }

    /**
     * Экспорт графа в формат для визуализации
     * @returns {object} Данные для визуализации
     */
    exportForVisualization() {
        const nodes = Array.from(this.nodes.values()).map(node => ({
            id: node.id,
            name: node.name,
            type: node.type,
            category: node.category,
            color: node.color,
            y: node.y,
            x: node.x,
            isDraggable: node.isDraggable
        }));
        
        const edges = Array.from(this.edges.values()).map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            name: edge.name,
            color: edge.color,
            weight: edge.weight,
            length: edge.length,
            isBidirectional: edge.isBidirectional
        }));
        
        return {
            nodes: nodes,
            edges: edges,
            adjacencyList: this.convertAdjacencyList(),
            stats: this.getStats()
        };
    }

    /**
     * Конвертация списка смежности в простой формат
     * @returns {object} Упрощённый список смежности
     */
    convertAdjacencyList() {
        const result = {};
        this.adjacencyList.forEach((neighbors, nodeId) => {
            result[nodeId] = Array.from(neighbors).map(n => ({
                nodeId: n.nodeId,
                edgeId: n.edgeId,
                weight: n.weight
            }));
        });
        return result;
    }

    /**
     * Импорт графа из формата визуализации
     * @param {object} data - Данные графа
     */
    importFromVisualization(data) {
        this.clear();
        
        // Импортируем узлы
        if (data.nodes) {
            data.nodes.forEach(node => {
                this.addNode(node);
            });
        }
        
        // Импортируем рёбра
        if (data.edges) {
            data.edges.forEach(edge => {
                this.addEdge(edge);
            });
        }
        
        console.log('Граф импортирован из визуализации:', {
            nodes: this.nodes.size,
            edges: this.edges.size
        });
    }
}

// Экспортируем класс для глобального использования
window.RoutingGraph = RoutingGraph;
