# 🗺️ Office Map Editor with Routing

A powerful, browser-based WYSIWYG editor for creating interactive office maps with room polygons and intelligent indoor navigation. Design your floor plan, define rooms, create waypoints, connect paths, and export a standalone interactive web map for desktop and mobile users.

![Editor Preview](https://via.placeholder.com/800x400?text=Office+Map+Editor+Preview)

## ✨ Features

- **Drag-and-Drop Floor Plan**: Use any image (PNG, JPG) as your office blueprint.
- **Room Editor**: Draw interactive polygons for each office, assign names, departments, employees, phone numbers, and custom colors.
- **Visual Routing System**:
  - Create waypoints (Entrances, Points of Interest, Connections).
  - Draw walkable connections between waypoints.
  - Automatic pathfinding (BFS) to find the shortest route between two points.
- **Data Persistence**: All data (rooms, points, connections) is saved automatically in your browser's `localStorage`.
- **One-Click Export**:
  - **Desktop Web App**: Export a fully functional HTML file with search and routing capabilities.
  - **Mobile Web App**: Export a touch-optimized version specifically for smartphones.
- **Import/Export Map Data**: Share or backup your map configuration.
- **Live Testing**: Test routing logic directly within the editor.

## 🛠️ Technologies Used

- **HTML5 / CSS3**: Responsive layout and mobile-first design.
- **JavaScript (ES6+)**: Core application logic.
- **Leaflet.js**: Interactive mapping and vector layer management.
- **Font Awesome**: Icons for UI elements.

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari).
- A local web server (e.g., VS Code Live Server, Python HTTP Server) due to CORS restrictions when loading local images. You can also use it directly online.

### Installation & Setup

1.  **Clone the repository** (or download the source code):
    ```bash
    git clone https://github.com/Diego-83/Office-map.git
    cd Office-map

 2. Project Structure:
Ensure your folder looks like this after setup:

```text
office-map-editor/
├── index.html
├── js/
│   ├── core/
│   │   ├── utils.js
│   │   ├── map-core.js
│   │   ├── data-manager.js
│   │   └── importer.js
│   ├── editors/
│   │   ├── polygons.js
│   │   └── routing-editor.js
│   ├── export/
│   │   ├── web-exporter.js
│   │   └── mobile-exporter.js
│   └── main.js
└── img/
    └── plan.png
```

    Add your floor plan: Place your floor plan image in the img/ folder and name it plan.png, or use the editor's UI to upload a new image.

Run the application: Serve the project using a local server.

Using Python: python -m http.server 8000

Using VS Code: Right-click index.html → "Open with Live Server".

Open your browser and navigate to http://localhost:8000.

📖 How to Use the Editor
1. Adding a Room (Polygon)
Go to the "Кабинеты" (Rooms) tab.

Enter the room details (Name, Department, Employees, Phone, Color).

Click "Рисовать полигон" (Draw Polygon).

Click on the map to create vertices of the room.

Double-click or click on the first vertex to finish drawing.

Adjust vertices by dragging them.

Click "Сохранить кабинет" (Save Room).

2. Creating Navigation Points
Go to the "Маршруты" (Routes) tab.

Enter a "Название точки" (Point Name) (e.g., "Elevator", "Reception").

Select a "Тип точки" (Point Type).

Check "Использовать в маршрутизации" (Use in Routing) if this point should be used for navigation.

Click "Создать точку на карте" (Create Point on Map) and click on the desired location.

3. Connecting Points (Creating Walkable Paths)
In the "Маршруты" (Routes) tab, click "Режим соединения" (Connection Mode).

Click on the first point (waypoint).

Click on the second point.

A line (connection) will be drawn automatically, allowing pathfinding between them.

4. Testing a Route
In the "Маршруты" (Routes) tab, find the "Тестирование маршрутов" (Testing Routes) section.

Select a "Откуда" (From) and "Куда" (To) point.

Click "Найти маршрут" (Find Route).

The shortest path will be highlighted on the map, and instructions will appear in the info box.

5. Exporting the Final Map
Go to the "Экспорт" (Export) tab.

Customize the Title, Description, and Color Theme.

Choose your export option:

"Экспортировать веб-интерфейс" (Export Web Interface): For desktop browsers.

"Экспортировать мобильную версию" (Export Mobile Version): For smartphones.

The HTML file will be downloaded. You can host this file on any web server or use it locally.

📁 File Structure & Key Modules
main.js: Initializes the application and connects the UI with core logic.

map-core.js: Handles Leaflet map initialization, image overlays, and coordinate transformations.

data-manager.js: Manages localStorage for saving/loading polygons, points, and connections.

polygons.js: Editor logic for drawing, editing, and saving room polygons.

routing-editor.js: Manages waypoints, connections, BFS pathfinding, and route visualization.

web-exporter.js & mobile-exporter.js: Generate the standalone HTML files.

importer.js: (New in latest update) Handles importing/exporting the complete map configuration.

🤝 Contributing
Contributions are welcome! Feel free to open an issue or submit a pull request for any improvements or bug fixes.

Fork the Project.

Create your Feature Branch (git checkout -b feature/AmazingFeature).

Commit your changes (git commit -m 'Add some AmazingFeature').

Push to the Branch (git push origin feature/AmazingFeature).

Open a Pull Request.

📝 License
This project is open-source and available under the MIT License.

⚠️ Important Notes
Image Loading: Due to browser CORS policies, you may not be able to use local file paths (e.g., C:\Users\...) directly. Always use a local server or host the images online.

Mobile Export: The mobile version generates a clean, simplified interface with large touch targets specifically designed for on-the-go navigation.

Data Backup: Your data is stored in localStorage. Clearing your browser cache will delete your map data. Use the Import/Export tab to create backups.

## 🤖 Acknowledgements

This project was generated with the assistance of **artificial intelligence** (DeepSeek). 
The code was written by AI based on user requirements. 

**Note:** The repository owner did not write the core code and may not be able to 
answer technical questions or modify the code without AI assistance.

## 🤖 Об авторстве

Данный проект создан при помощи **искусственного интеллекта** (DeepSeek) по запросу пользователя.
Автор репозитория не является автором кода и может испытывать трудности с его самостоятельной 
доработкой или объяснением без помощи ИИ.

📧 Contact
Project Link: https://github.com/Diego-83/Office-map
