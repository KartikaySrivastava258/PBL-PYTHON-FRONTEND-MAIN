


import React from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveToken } from "../utils/auth";
import { toast, Toaster } from "sonner";
import "../theme.css";


const schema = z.object({
  email: z.string().email({ message: "Enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

function LoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    setError,
    clearErrors,
    getValues,
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data) => {
    clearErrors();
    try {
      const response = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errText = await response.text();
        setError("email", { type: "manual", message: errText || "Login failed" });
        toast.error("Login Failed", { description: errText || "Login failed", duration: 5000 });
        return;
      }
      const result = await response.json();
      if (!result.access_token || !result.user) {
        setError("email", { type: "manual", message: "Invalid server response" });
        toast.error("Login Failed", { description: "Invalid server response", duration: 5000 });
        return;
      }
      saveToken(result.access_token, result.user);
      toast.success("Login Successful", { description: `Welcome, ${result.user.email || "user"}!`, duration: 5000 });
      const role = result.user.role;
      setTimeout(() => {
        if (role === "admin") navigate("/admin");
        else if (role === "teacher") navigate("/teacher");
        else navigate("/chat");
      }, 800); // allow toast to show before redirect
    } catch (err) {
      setError("email", { type: "manual", message: err.message });
      toast.error("Login Failed", { description: err.message, duration: 5000 });
      console.error("Login error:", err);
    }
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--gradient-bg)",
        fontFamily: "var(--font-family)",
      }}>
        <div style={{
          maxWidth: 448,
          width: "100%",
          borderRadius: "var(--radius-xl)",
          background: "var(--card)",
          boxShadow: "var(--shadow-glow)",
          border: "1px solid var(--border)",
          padding: 32,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}>
          {/* Logo */}
          <div style={{
            width: 64,
            height: 64,
            borderRadius: "var(--radius-xl)",
            background: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-glow)",
            marginBottom: 8,
          }}>
            <MessageSquare color="#fff" size={40} />
          </div>
          {/* Heading */}
          <h1 style={{
            fontSize: "2.5rem",
            fontWeight: "700",
            color: "var(--foreground)",
            margin: 0,
          }}>Welcome Back</h1>
          <p style={{
            color: "var(--muted-foreground)",
            fontSize: "1rem",
            fontWeight: "500",
            margin: 0,
          }}>Sign in to continue to your chats</p>
          {/* Form */}
          <form style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }} onSubmit={handleSubmit(onSubmit)}>
            <label style={{
              color: "var(--foreground)",
              fontWeight: "500",
              marginBottom: 4,
            }} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Email"
              {...register("email")}
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "0 16px",
                height: 40,
                fontSize: "1rem",
                outline: "none",
                transition: "var(--transition)",
                marginBottom: 4,
              }}
            />
            {errors.email && (
              <div style={{
                color: "var(--destructive)",
                fontSize: "var(--font-size-sm)",
                marginBottom: 4,
              }}>{errors.email.message}</div>
            )}
            <label style={{
              color: "var(--foreground)",
              fontWeight: "500",
              marginBottom: 4,
            }} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              {...register("password")}
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "0 16px",
                height: 40,
                fontSize: "1rem",
                outline: "none",
                transition: "var(--transition)",
                marginBottom: 4,
              }}
            />
            {errors.password && (
              <div style={{
                color: "var(--destructive)",
                fontSize: "var(--font-size-sm)",
                marginBottom: 4,
              }}>{errors.password.message}</div>
            )}
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              style={{
                width: "100%",
                background: isSubmitting ? "var(--primary-glow)" : "var(--primary)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius)",
                height: 40,
                fontWeight: "600",
                fontSize: "1rem",
                boxShadow: "var(--shadow-glow)",
                cursor: isSubmitting || !isValid ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "var(--transition)",
                marginTop: 8,
              }}
            >
              {isSubmitting ? <Loader2 size={20} style={{marginRight: 8}} className="spin" /> : null}
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>
          {/* Demo credentials */}
          <div style={{
            color: "var(--muted-foreground)",
            fontSize: "var(--font-size-sm)",
            marginTop: 16,
            textAlign: "center",
          }}>
            <span>Demo: <b>admin@gmail.com</b> / <b>admin@1234</b></span>
          </div>
        </div>
      </div>
    </>
  );
}

export default LoginPage;
