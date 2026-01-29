/**
 * Визуализация графа маршрутизации на карте
 */

class RoutingVisual {
    constructor(mapCore, routingGraph) {
        this.mapCore = mapCore;
        this.routingGraph = routingGraph;
        
        this.layers = {
            nodes: new Map(),     // Map<nodeId, L.CircleMarker>
            edges: new Map(),     // Map<edgeId, L.Polyline>
            temp: new Map(),      // Временные слои
            highlighted: new Set() // Подсвеченные элементы
        };
        
        this.selectedNode = null;
        this.selectedEdge = null;
        
        this.init();
    }

    /**
     * Инициализация визуализации
     */
    init() {
        console.log('Инициализация визуализации графа...');
        this.renderGraph();
    }

    /**
     * Отрисовка всего графа
     */
    renderGraph() {
        console.log('Отрисовка графа...');
        
        // Очищаем существующие слои
        this.clearAllLayers();
        
        // Отрисовываем рёбра
        this.routingGraph.edges.forEach((edge, edgeId) => {
            this.drawEdge(edge);
        });
        
        // Отрисовываем узлы
        this.routingGraph.nodes.forEach((node, nodeId) => {
            this.drawNode(node);
        });
        
        console.log('Граф отрисован:', {
            nodes: this.layers.nodes.size,
            edges: this.layers.edges.size
        });
    }

    /**
     * Отрисовка узла
     * @param {object} node - Данные узла
     * @returns {L.CircleMarker} Созданный маркер
     */
    drawNode(node) {
        const marker = L.circleMarker([node.y, node.x], {
            radius: node.category === 'room' ? 10 : 8,
            color: '#ffffff',
            fillColor: node.color,
            fillOpacity: 0.9,
            weight: 2,
            className: 'graph-node',
            draggable: node.isDraggable
        });

        // Добавляем на карту
        marker.addTo(this.mapCore.layerGroups.routes);
        
        // Создаем popup
        const popupContent = this.createNodePopup(node);
        marker.bindPopup(popupContent, {
            maxWidth: 300
        });

        // Добавляем обработчики событий
        marker.on('click', (e) => {
            this.selectNode(node.id);
            e.originalEvent.stopPropagation();
        });

        marker.on('contextmenu', (e) => {
            e.originalEvent.preventDefault();
            this.showNodeContextMenu(node.id, e.latlng);
        });

        // Обработчик перетаскивания
        if (node.isDraggable) {
            marker.on('drag', (e) => {
                this.handleNodeDrag(node.id, e.target.getLatLng());
            });
            
            marker.on('dragend', (e) => {
                this.handleNodeDragEnd(node.id, e.target.getLatLng());
            });
        }

        // Сохраняем слой
        this.layers.nodes.set(node.id, marker);
        
        return marker;
    }

    /**
     * Отрисовка ребра
     * @param {object} edge - Данные ребра
     * @returns {L.Polyline} Созданная линия
     */
    drawEdge(edge) {
        const sourceNode = this.routingGraph.getNode(edge.source);
        const targetNode = this.routingGraph.getNode(edge.target);
        
        if (!sourceNode || !targetNode) {
            console.warn('Не найдены узлы для ребра:', edge.id);
            return null;
        }

        // Создаём кривую Безье для более естественного вида
        const points = this.createCurvedLine(
            [sourceNode.y, sourceNode.x],
            [targetNode.y, targetNode.x]
        );

        const polyline = L.polyline(points, {
            color: edge.color,
            weight: edge.weight || 3,
            opacity: 0.7,
            className: 'graph-edge',
            dashArray: edge.isBidirectional ? null : '10, 5'
        });

        // Добавляем на карту
        polyline.addTo(this.mapCore.layerGroups.routes);
        
        // Создаем popup
        const popupContent = this.createEdgePopup(edge, sourceNode, targetNode);
        polyline.bindPopup(popupContent, {
            maxWidth: 300
        });

        // Добавляем обработчики событий
        polyline.on('click', (e) => {
            this.selectEdge(edge.id);
            e.originalEvent.stopPropagation();
        });

        polyline.on('contextmenu', (e) => {
            e.originalEvent.preventDefault();
            this.showEdgeContextMenu(edge.id, e.latlng);
        });

        // Сохраняем слой
        this.layers.edges.set(edge.id, polyline);
        
        return polyline;
    }

    /**
     * Создание кривой линии между двумя точками
     * @param {Array} start - Начальная точка [y, x]
     * @param {Array} end - Конечная точка [y, x]
     * @returns {Array} Массив точек кривой
     */
    createCurvedLine(start, end) {
        const [y1, x1] = start;
        const [y2, x2] = end;
        
        // Рассчитываем контрольную точку для кривой Безье
        const midY = (y1 + y2) / 2;
        const midX = (x1 + x2) / 2;
        
        // Смещаем контрольную точку перпендикулярно линии
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Если линия очень короткая, не создаём кривую
        if (length < 30) {
            return [start, end];
        }
        
        // Перпендикулярный вектор (повернутый на 90 градусов)
        const perpX = -dy / length * 10; // Высота изгиба
        const perpY = dx / length * 10;
        
        const controlY = midY + perpY;
        const controlX = midX + perpX;
        
        // Создаём точки кривой Безье (квадратичной)
        const points = [];
        const steps = 10;
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            
            // Формула квадратичной кривой Безье
            const y = Math.pow(1 - t, 2) * y1 + 
                      2 * (1 - t) * t * controlY + 
                      Math.pow(t, 2) * y2;
            
            const x = Math.pow(1 - t, 2) * x1 + 
                      2 * (1 - t) * t * controlX + 
                      Math.pow(t, 2) * x2;
            
            points.push([y, x]);
        }
        
        return points;
    }

    /**
     * Создание popup для узла
     * @param {object} node - Данные узла
     * @returns {string} HTML содержимое
     */
    createNodePopup(node) {
        const neighbors = this.routingGraph.getNeighbors(node.id);
        const neighborCount = neighbors.length;
        
        return `
            <div style="padding: 10px; max-width: 300px;">
                <h4 style="margin: 0 0 10px 0; color: ${node.color}">
                    <i class="fas fa-circle"></i> ${Utils.escapeHtml(node.name)}
                </h4>
                <p><strong>Тип:</strong> ${this.getNodeTypeLabel(node.type)}</p>
                <p><strong>Категория:</strong> ${this.getNodeCategoryLabel(node.category)}</p>
                <p><strong>Координаты:</strong> y=${node.y.toFixed(1)}, x=${node.x.toFixed(1)}</p>
                <p><strong>Соединений:</strong> ${neighborCount}</p>
                <p><strong>Перетаскиваемый:</strong> ${node.isDraggable ? 'Да' : 'Нет'}</p>
                ${node.metadata.roomId ? `
                    <p><strong>Кабинет:</strong> ${node.metadata.originalRoom?.name || node.metadata.roomId}</p>
                ` : ''}
                <div style="margin-top: 10px; font-size: 12px; color: #666;">
                    <i class="fas fa-mouse-pointer"></i> Клик - выделить, ПКМ - меню
                </div>
            </div>
        `;
    }

    /**
     * Создание popup для ребра
     * @param {object} edge - Данные ребра
     * @param {object} sourceNode - Исходный узел
     * @param {object} targetNode - Целевой узел
     * @returns {string} HTML содержимое
     */
    createEdgePopup(edge, sourceNode, targetNode) {
        return `
            <div style="padding: 10px; max-width: 300px;">
                <h4 style="margin: 0 0 10px 0; color: ${edge.color}">
                    <i class="fas fa-link"></i> ${Utils.escapeHtml(edge.name)}
                </h4>
                <p><strong>От:</strong> ${Utils.escapeHtml(sourceNode.name)}</p>
                <p><strong>До:</strong> ${Utils.escapeHtml(targetNode.name)}</p>
                <p><strong>Длина:</strong> ${edge.length.toFixed(1)} ед.</p>
                <p><strong>Направление:</strong> ${edge.isBidirectional ? 'Двустороннее' : 'Одностороннее'}</p>
                <p><strong>Вес:</strong> ${edge.weight || 1}</p>
                <div style="margin-top: 10px; font-size: 12px; color: #666;">
                    <i class="fas fa-mouse-pointer"></i> Клик - выделить, ПКМ - меню
                </div>
            </div>
        `;
    }

    /**
     * Получение читаемой метки типа узла
     * @param {string} type - Тип узла
     * @returns {string} Читаемая метка
     */
    getNodeTypeLabel(type) {
        const labels = {
            'point': 'Точка',
            'room-center': 'Центр кабинета',
            'door': 'Дверь',
            'intersection': 'Пересечение',
            'custom': 'Пользовательский',
            'node': 'Узел',
            'room_entrance': 'Вход в кабинет',
            'point_of_interest': 'Точка интереса'
        };
        
        return labels[type] || type;
    }

    /**
     * Получение читаемой метки категории узла
     * @param {string} category - Категория узла
     * @returns {string} Читаемая метка
     */
    getNodeCategoryLabel(category) {
        const labels = {
            'point': 'Точка',
            'room': 'Кабинет',
            'door': 'Дверь',
            'junction': 'Соединение',
            'custom': 'Пользовательский'
        };
        
        return labels[category] || category;
    }

    /**
     * Выбор узла
     * @param {string} nodeId - ID узла
     */
    selectNode(nodeId) {
        // Сбрасываем предыдущее выделение
        this.resetSelection();
        
        const marker = this.layers.nodes.get(nodeId);
        if (marker) {
