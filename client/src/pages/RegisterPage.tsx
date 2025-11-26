import React, { useState } from "react";
import { Mail, Lock, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Wachtwoorden komen niet overeen");
      return;
    }
    // TODO: Implementeer registratie logica
    console.log("Registratie:", { name, email, password });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0C1830] via-[#0F1F3A] to-[#0A1528] relative overflow-hidden">
      {/* Subtiele achtergrond decoratie */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
      </div>

      {/* Centrale container */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        {/* Logo en titel */}
        <div className="text-center mb-8 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-2 tracking-tight drop-shadow-lg">
            112<span className="text-[#E94F37]">.</span>
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-wider drop-shadow-lg">
            OPERATIONS
          </h2>
          <p className="text-sm text-white/70 font-light tracking-wide">
            Account aanmaken
          </p>
        </div>

        {/* Registratie kaart */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-8 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Naam veld */}
            <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.3s" }}>
              <label htmlFor="name" className="text-sm font-medium text-white/90">
                Naam
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Jouw volledige naam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-[#E94F37] focus:ring-[#E94F37] focus:ring-2 transition-all duration-300"
                />
              </div>
            </div>

            {/* E-mail veld */}
            <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.4s" }}>
              <label htmlFor="email" className="text-sm font-medium text-white/90">
                E-mailadres
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                <Input
                  id="email"
                  type="email"
                  placeholder="jouw@email.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-[#E94F37] focus:ring-[#E94F37] focus:ring-2 transition-all duration-300"
                />
              </div>
            </div>

            {/* Wachtwoord veld */}
            <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.5s" }}>
              <label htmlFor="password" className="text-sm font-medium text-white/90">
                Wachtwoord
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-[#E94F37] focus:ring-[#E94F37] focus:ring-2 transition-all duration-300"
                />
              </div>
            </div>

            {/* Bevestig wachtwoord veld */}
            <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.6s" }}>
              <label htmlFor="confirmPassword" className="text-sm font-medium text-white/90">
                Bevestig wachtwoord
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-[#E94F37] focus:ring-[#E94F37] focus:ring-2 transition-all duration-300"
                />
              </div>
            </div>

            {/* Registreer knop */}
            <Button
              type="submit"
              className="w-full bg-[#E94F37] hover:bg-[#D43E27] text-white font-semibold py-6 rounded-lg shadow-lg shadow-[#E94F37]/30 hover:shadow-[#E94F37]/50 transition-all duration-300 hover:scale-[1.02] animate-fade-up"
              style={{ animationDelay: "0.7s" }}
            >
              Account aanmaken
            </Button>

            {/* Terug naar inloggen */}
            <div className="text-center animate-fade-up" style={{ animationDelay: "0.8s" }}>
              <p className="text-sm text-white/70">
                Heb je al een account?{" "}
                <Link
                  href="/login"
                  className="text-[#E94F37] hover:text-[#D43E27] font-semibold transition-colors duration-200"
                >
                  Inloggen
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center animate-fade-up" style={{ animationDelay: "0.9s" }}>
          <p className="text-xs text-white/40 font-light">
            © 2025 Operationeel Centrum Simulator — alle rechten voorbehouden
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-fade-up {
          animation: fade-up 0.6s ease-out both;
        }
      `}</style>
    </div>
  );
}

