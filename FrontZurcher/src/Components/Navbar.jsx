import React from "react";
import logo from "../assets/logoseptic.png";
import { EnvelopeIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

function Navbar() {
  return (
    <nav className="bg-[#0A1E3C] shadow-lg">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center">
            <img
              src={logo}
              alt="Logo"
              className="h-10 md:h-12 w-auto bg-white p-1 rounded-md"
            />
            <span className="hidden sm:block ml-4 text-white font-bold text-lg md:text-xl tracking-wide">
              ZURCHER CONSTRUCTION
            </span>
          </div>

          {/* Right side icons */}
          <div className="flex items-center space-x-2 md:space-x-4">
            <button className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <span className="sr-only">Messages</span>
              <EnvelopeIcon className="h-6 w-6" />
            </button>
            <button className="flex items-center space-x-2 p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <ArrowRightOnRectangleIcon className="h-6 w-6" />
              <span className="hidden md:block text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
