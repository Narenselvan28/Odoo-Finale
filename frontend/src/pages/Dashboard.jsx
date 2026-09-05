import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { userApi } from "../api";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (user?.role === "admin") {
      setLoadingUsers(true);
      userApi
        .getAll()
        .then(({ data }) => setUsers(data.users))
        .catch(console.error)
        .finally(() => setLoadingUsers(false));
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard">
      <header className="dash-header">
        <h1>MERN-MySQL Dashboard</h1>
        <div className="user-info">
          <span>👤 {user?.name} ({user?.role})</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <section className="profile-card">
        <h2>My Profile</h2>
        <p><strong>Name:</strong> {user?.name}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Role:</strong> {user?.role}</p>
        <p><strong>Status:</strong> {user?.isActive ? "✅ Active" : "❌ Inactive"}</p>
      </section>

      {user?.role === "admin" && (
        <section className="users-section">
          <h2>All Users</h2>
          {loadingUsers ? (
            <p>Loading users...</p>
          ) : (
            <table className="user-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id}>
                    <td>{i + 1}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.isActive ? "✅" : "❌"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
};

export default Dashboard;
