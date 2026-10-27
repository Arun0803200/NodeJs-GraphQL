import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ApolloProvider } from "@apollo/client/react";
import { client } from "./api/client";
import { AuthProvider } from "./context/AuthContext";
import { UiLangProvider } from "./i18n/UiLang";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";

// Auth pages
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage, ForgotPasswordPage } from "./pages/auth/RegisterPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";

// Admin pages
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminUserDetailPage } from "./pages/admin/AdminUserDetailPage";
import { AdminMessagesPage } from "./pages/admin/AdminMessagesPage";
import { AdminTemplatesPage } from "./pages/admin/AdminTemplatesPage";
import { AdminApprovalsPage } from "./pages/admin/AdminApprovalsPage";
import { AdminMastersPage } from "./pages/admin/AdminMastersPage";
import { AdminApiLogsPage } from "./pages/admin/AdminApiLogsPage";
import { AdminActivityPage } from "./pages/admin/AdminActivityPage";
import { AdminEnquiriesPage } from "./pages/admin/AdminEnquiriesPage";
import { PageTracker } from "./components/analytics/PageTracker";

// User pages
import { UserDashboard } from "./pages/user/UserDashboard";
import { ProfilePage } from "./pages/user/ProfilePage";
import { AboutPage } from "./pages/user/AboutPage";
import { ExperiencePage } from "./pages/user/ExperiencePage";
import { ProjectsPage } from "./pages/user/ProjectsPage";
import { SkillsPage } from "./pages/user/SkillsPage";
import { AwardsPage } from "./pages/user/AwardsPage";
import { EducationPage } from "./pages/user/EducationPage";
import { ImagesPage } from "./pages/user/ImagesPage";
import { MyWebsitePage } from "./pages/user/MyWebsitePage";
import { MessagesPage } from "./pages/user/MessagesPage";
import { BookingsPage } from "./pages/user/BookingsPage";
import { DriverApplicationsPage } from "./pages/user/DriverApplicationsPage";
import { ReviewsPage } from "./pages/user/ReviewsPage";
import { FormSubmissionsPage } from "./pages/user/FormSubmissionsPage";

// Public pages
import { PublicPortfolioPage } from "./pages/public/PublicPortfolioPage";
import { GuestLayout } from "./components/guest/GuestLayout";
import { HomePage } from "./pages/guest/HomePage";
import { TemplateDetailPage } from "./pages/guest/TemplateDetailPage";
import { CustomizePage } from "./pages/guest/CustomizePage";

import { DesignPreviewPage } from "./pages/dev/DesignPreviewPage";

import "./index.css";
import "./styles/guest.css";

function App() {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <UiLangProvider>
        <BrowserRouter>
          <PageTracker />
          <Routes>
            {/* Auth (public) */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

            {/* Admin panel */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AppLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="users/:uuid" element={<AdminUserDetailPage />} />
              <Route path="messages" element={<AdminMessagesPage />} />
              <Route path="templates" element={<AdminTemplatesPage />} />
              <Route path="approvals" element={<AdminApprovalsPage />} />
              <Route path="masters" element={<AdminMastersPage />} />
              <Route path="api-logs" element={<AdminApiLogsPage />} />
              <Route path="activity" element={<AdminActivityPage />} />
              <Route path="enquiries" element={<AdminEnquiriesPage />} />
            </Route>

            {/* User panel */}
            <Route path="/user" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<UserDashboard />} />
              <Route path="website" element={<MyWebsitePage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="experience" element={<ExperiencePage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="skills" element={<SkillsPage />} />
              <Route path="awards" element={<AwardsPage />} />
              <Route path="education" element={<EducationPage />} />
              <Route path="images" element={<ImagesPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="drivers" element={<DriverApplicationsPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="forms" element={<FormSubmissionsPage />} />
            </Route>

            {/* Guest storefront (default landing page) */}
            <Route element={<GuestLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/templates/:slug" element={<TemplateDetailPage />} />
            </Route>
            <Route path="/templates/:slug/customize" element={<CustomizePage />} />

            {import.meta.env.DEV && <Route path="/__preview" element={<DesignPreviewPage />} />}

            {/* Public portfolio by username, e.g. /arun-palani */}
            <Route path="/:userName" element={<PublicPortfolioPage />} />

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </UiLangProvider>
      </AuthProvider>
    </ApolloProvider>
  );
}

export default App;
