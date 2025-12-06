const Sidebar = ({ categories }) => (
  <aside className="sidebar">
    <div className="status">
      <ul className="status-list">
        {categories.map((category) => (
          <li key={category.name}>
            <button className="status-item">
              <i className={`fas ${category.icon}`} /> {category.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  </aside>
)

export default Sidebar
