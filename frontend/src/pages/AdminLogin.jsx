import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function AdminLogin() {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { adminLogin, demoLogin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const [isDemo, setIsDemo] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);

    if (isDemo) {
      demoLogin("admin", { name: "Admin User", email: data.email });
      addToast("Welcome Admin (Demo Account)", "success");
      navigate("/admin/dashboard");
      setLoading(false);
      return;
    }

    try {
      await adminLogin({
        email: data.email,
        password: data.password,
      });
      addToast("Welcome Admin", "success");
      navigate("/admin/dashboard");
    } catch (err) {
      if (err.response) {
        if (err.response.status === 400) {
          addToast("Invalid Credentials", "error");
        } else {
          addToast("An error occurred. Please try again.", "error");
        }
      } else {
        addToast("Network Error: Could not reach the server.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Link to="/" className="auth-logo">
        AgriFlow
      </Link>

      <div className="auth-card card">
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "var(--color-text-primary)",
            }}
          >
            Admin Portal
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-text-secondary)",
              marginTop: "4px",
            }}
          >
            Sign in to manage the platform
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className={`form-input${errors.email ? " error" : ""}`}
              type="email"
              placeholder="admin@agriflow.ng"
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && (
              <span className="form-error">{errors.email.message}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="pw-wrap">
              <input
                className={`form-input${errors.password ? " error" : ""}`}
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                {...register("password", { required: "Password is required" })}
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw(!showPw)}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <span className="form-error">{errors.password.message}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-solid btn-full"
            style={{ marginTop: "8px" }}
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Log In as Admin"}
          </button>
        </form>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          background: var(--color-surface);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 16px;
          background-image: radial-gradient(ellipse at center, rgba(26,107,60,0.04) 0%, transparent 70%);
        }
        .auth-logo {
          font-size: 26px;
          font-weight: 700;
          color: var(--color-primary);
          font-family: var(--font-heading);
          margin-bottom: 28px;
          letter-spacing: -0.5px;
        }
        .auth-card {
          width: 100%;
          max-width: 480px;
          padding: 32px;
        }
        .auth-form { display: flex; flex-direction: column; gap: 20px; }
        .pw-wrap { position: relative; }
        .pw-toggle {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          font-size: 12px; font-weight: 600; color: var(--color-text-secondary);
        }
        .pw-toggle:hover { color: var(--color-text-primary); }
      `}</style>
    </div>
  );
}
