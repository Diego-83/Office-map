/**
 * Алгоритмы поиска пути для экспорта
 */

class RouteFinder {
    /**
     * Поиск кратчайшего пути (алгоритм Дейкстры)
     * @param {object} graphData - Данные графа
     * @param {string} startNodeId - ID начального узла
     * @param {string} endNodeId - ID конечного узла
     * @returns {object} Результат поиска
     */
    static findShortestPath(graphData, startNodeId, endNodeId) {
        try {
            console.log('Поиск пути (Дейкстра):', startNodeId, '->', endNodeId);
            
            // Создаём структуры данных для алгоритма
            const distances = new Map();
            const previous = new Map();
            const visited = new Set();
            const unvisited = new Set();
            
            // Инициализация
            graphData.nodes.forEach(node => {
                distances.set(node.id, Infinity);
                previous.set(node.id, null);
                unvisited.add(node.id);
            });
            
            distances.set(startNodeId, 0);
            const startTime = performance.now();
            
            // Основной цикл алгоритма Дейкстры
            while (unvisited.size > 0) {
                // Находим узел с минимальным расстоянием
                let currentNodeId = null;
                let minDistance = Infinity;
                
                for (const nodeId of unvisited) {
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
                
                unvisited.delete(currentNodeId);
                visited.add(currentNodeId);
                
                // Обрабатываем соседей
                const neighbors = this.getNeighbors(graphData, currentNodeId);
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
            const result = this.reconstructPath(
                graphData, 
                startNodeId, 
                endNodeId, 
                distances, 
                previous
            );
            
            const endTime = performance.now();
            result.searchTime = endTime - startTime;
            
            return result;
            
        } catch (error) {
            console.error('Ошибка поиска пути:', error);
            return {
                success: false,
                message: error.message,
                searchTime: 0
            };
        }
    }
    
    /**
     * Получение соседей узла
     */
    static getNeighbors(graphData, nodeId) {
        const neighbors = [];
        
        // Ищем рёбра, связанные с узлом
        graphData.edges.forEach(edge => {
            if (edge.source === nodeId) {
                neighbors.push({
                    nodeId: edge.target,
                    edgeId: edge.id,
                    weight: edge.length || 1
                });
            }
            
            if (edge.isBidirectional && edge.target === nodeId) {
                neighbors.push({
                    nodeId: edge.source,
                    edgeId: edge.id,
                    weight: edge.length || 1
                });
            }
        });
        
        return neighbors;
    }
    
    /**
     * Восстановление пути
     */
    static reconstructPath(graphData, startNodeId, endNodeId, distances, previous) {
        const path = [];
        const edges = [];
        const nodes = [];
        let currentNodeId = endNodeId;
        let totalLength = 0;
        
        // Находим узлы в пути
        while (currentNodeId !== null && previous.get(currentNodeId) !== null) {
            const prev = previous.get(currentNodeId);
            path.unshift(currentNodeId);
            
            // Находим ребро
            const edge = graphData.edges.find(e => e.id === prev.edgeId);
            if (edge) {
                edges.unshift(edge);
                totalLength += edge.length || 1;
            }
            
            // Находим узел
            const node = graphData.nodes.find(n => n.id === currentNodeId);
            if (node) {
                nodes.unshift(node);
            }
            
            currentNodeId = prev.nodeId;
        }
        
        // Добавляем начальный узел
        if (currentNodeId === startNodeId) {
            path.unshift(startNodeId);
            
            const startNode = graphData.nodes.find(n => n.id === startNodeId);
            if (startNode) {
                nodes.unshift(startNode);
            }
            
            const endNode = graphData.nodes.find(n => n.id === endNodeId);
            
            return {
                success: true,
                path: path,
                edges: edges.map(e => e.id),
                nodes: nodes,
                length: totalLength,
                startNode: startNode,
                endNode: endNode
            };
        }
        
        return {
            success: false,
            message: 'Путь не найден'
        };
    }
    
    /**
     * Поиск всех путей (для отладки)
     */
    static findAllPaths(graphData, startNodeId, endNodeId, maxDepth = 6) {
        const paths = [];
        const visited = new Set();
        
        const dfs = (currentNodeId, currentPath, currentEdges, depth) => {
            if (depth > maxDepth) return;
            if (currentNodeId === endNodeId) {
                paths.push({
                    path: [...currentPath, currentNodeId],
                    edges: [...currentEdges],
                    length: this.calculatePathLength(currentEdges),
                    depth: depth
                });
                return;
            }
            
            visited.add(currentNodeId);
            
            const neighbors = this.getNeighbors(graphData, currentNodeId);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor.nodeId)) {
                    const edge = graphData.edges.find(e => e.id === neighbor.edgeId);
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
     */
    static calculatePathLength(edges) {
        return edges.reduce((total, edge) => total + (edge.length || 1), 0);
    }
    
    /**
     * Валидация графа для поиска пути
     */
    static validateGraphForPathfinding(graphData) {
        const issues = [];
        
        // Проверяем наличие узлов
        if (!graphData.nodes || graphData.nodes.length === 0) {
            issues.push('Граф не содержит узлов');
        }
        
        // Проверяем наличие рёбер
        if (!graphData.edges || graphData.edges.length === 0) {
            issues.push('Граф не содержит рёбер');
        }
        
        // Проверяем связность графа
        if (graphData.nodes && graphData.nodes.length > 0) {
            const visited = new Set();
            const stack = [graphData.nodes[0].id];
            
            while (stack.length > 0) {
                const currentNodeId = stack.pop();
                if (!visited.has(currentNodeId)) {
                    visited.add(currentNodeId);
                    const neighbors = this.getNeighbors(graphData, currentNodeId);
                    neighbors.forEach(neighbor => {
                        if (!visited.has(neighbor.nodeId)) {
                            stack.push(neighbor.nodeId);
                        }
                    });
                }
            }
            
            const connectivity = (visited.size / graphData.nodes.length) * 100;
            if (connectivity < 100) {
                issues.push(\`Граф не полностью связный: \${connectivity.toFixed(1)}%\`);
            }
        }
        
        // Проверяем рёбра с нулевой длиной
        if (graphData.edges) {
            graphData.edges.forEach(edge => {
                if (edge.length === 0) {
                    issues.push(\`Ребро "\${edge.name}" имеет нулевую длину\`);
                }
            });
        }
        
        return {
            isValid: issues.length === 0,
            issues: issues,
            summary: {
                nodes: graphData.nodes?.length || 0,
                edges: graphData.edges?.length || 0,
                issueCount: issues.length
            }
        };
    }
    
    /**
     * Оптимизация графа для экспорта
     */
    static optimizeGraphForExport(graphData) {
        const optimized = {
            nodes: [],
            edges: [],
            metadata: {
                optimized: true,
                originalNodes: graphData.nodes?.length || 0,
                originalEdges: graphData.edges?.length || 0
            }
        };
        
        // Оптимизируем узлы
        if (graphData.nodes) {
            optimized.nodes = graphData.nodes.map(node => ({
                i: node.id, // id
                n: node.name, // name
                t: node.type || 'node', // type
                c: node.color || '#3498db', // color
                y: node.y, // y coordinate
                x: node.x // x coordinate
            }));
        }
        
        // Оптимизируем рёбра
        if (graphData.edges) {
            optimized.edges = graphData.edges.map(edge => ({
                i: edge.id, // id
                s: edge.source, // source
                t: edge.target, // target
                n: edge.name, // name
                c: edge.color || '#2ecc71', // color
                w: edge.weight || 3, // weight
                l: edge.length || 1, // length
                b: edge.isBidirectional !== false // bidirectional
            }));
        }
        
        // Рассчитываем статистику
        const validation = this.validateGraphForPathfinding(graphData);
        optimized.metadata.validation = validation;
        
        return optimized;
    }
    
    /**
     * Создание тестового графа
     */
    static createTestGraph() {
        const nodes = [];
        const edges = [];
        
        // Создаём сетку узлов
        const gridSize = 5;
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const nodeId = \`node_\${y}_\${x}\`;
                nodes.push({
                    id: nodeId,
                    name: \`Точка \${y * gridSize + x + 1}\`,
                    type: 'point',
                    color: '#3498db',
                    y: 200 + y * 150,
                    x: 200 + x * 150
                });
                
                // Создаём соединения с соседями
                if (x > 0) {
                    const leftNodeId = \`node_\${y}_\${x - 1}\`;
                    edges.push({
                        id: \`edge_\${nodeId}_to_\${leftNodeId}\`,
                        source: nodeId,
                        target: leftNodeId,
                        name: \`Соединение \${nodes.length} → \${nodes.length - 1}\`,
                        color: '#2ecc71',
                        weight: 3,
                        length: 150,
                        isBidirectional: true
                    });
                }
                
                if (y > 0) {
                    const topNodeId = \`node_\${y - 1}_\${x}\`;
                    edges.push({
                        id: \`edge_\${nodeId}_to_\${topNodeId}\`,
                        source: nodeId,
                        target: topNodeId,
                        name: \`Соединение \${nodes.length} → \${nodes.length - gridSize}\`,
                        color: '#2ecc71',
                        weight: 3,
                        length: 150,
                        isBidirectional: true
                    });
                }
            }
        }
        
        return {
            nodes: nodes,
            edges: edges,
            metadata: {
                type: 'test-grid',
                size: gridSize,
                totalNodes: nodes.length,
                totalEdges: edges.length,
                createdAt: new Date().toISOString()
            }
        };
    }
}

// Экспортируем класс для глобального использования
window.RouteFinder = RouteFinder;
