import React from 'react';
import logo from '../assets/logoseptic.png';


function Navbar() {
    return (
        <nav className="bg-blue-500 p-4">
            <div className="container mx-auto flex items-center justify-between">
                {/* Logo */}
                <div className="text-white font-bold text-xl">
 <img src={logo} alt="Logo" className="h-12" />
 </div>


                {/* Navigation Links */}
                <div className="flex space-x-4">
                    <a href="/" className="text-white hover:text-blue-200">
                        Página Principal
                    </a>
                    <a href="/seguimiento" className="text-white hover:text-blue-200">
                        Seguimiento
                    </a>
                    <a href="/dashboard" className="text-white hover:text-blue-200">
                        Dashboard
                    </a>
                </div>
            </div>
        </nav>
    );
}


export default Navbar;