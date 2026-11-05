import { Navigate, Route, Routes } from 'react-router-dom'
import GuestOnly from './components/auth/GuestOnly'
import RequireAuth from './components/auth/RequireAuth'
import RequirePermission from './components/auth/RequirePermission'
import AuthScreen from './components/auth/AuthScreen'
import Dashboard from './components/dashboard/Dashboard'
import Overview from './components/dashboard/Overview'
import ComingSoon from './components/dashboard/ComingSoon'
import RoleManagement from './modules/roles/RoleManagement'
import UserManagement from './modules/users/UserManagement'

function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<AuthScreen />} />
        <Route path="/reset-password" element={<AuthScreen initialMode="reset" />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<Dashboard />}>
          <Route element={<RequirePermission page="Overview" />}>
            <Route index element={<Overview />} />
          </Route>
          <Route element={<RequirePermission page="Orders" />}>
            <Route path="orders" element={<ComingSoon page="Orders" />} />
          </Route>
          <Route element={<RequirePermission page="Products" />}>
            <Route path="products" element={<ComingSoon page="Products" />} />
          </Route>
          <Route element={<RequirePermission page="Inventory" />}>
            <Route path="inventory" element={<ComingSoon page="Inventory" />} />
          </Route>
          <Route element={<RequirePermission page="Customers" />}>
            <Route path="customers" element={<ComingSoon page="Customers" />} />
          </Route>
          <Route element={<RequirePermission page="Roles" />}>
            <Route path="roles" element={<RoleManagement />} />
          </Route>
          <Route element={<RequirePermission page="Users" />}>
            <Route path="users" element={<UserManagement />} />
          </Route>
          <Route element={<RequirePermission page="Reports" />}>
            <Route path="reports" element={<ComingSoon page="Reports" />} />
          </Route>
          <Route element={<RequirePermission page="Settings" />}>
            <Route path="settings" element={<ComingSoon page="Settings" />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export default App
