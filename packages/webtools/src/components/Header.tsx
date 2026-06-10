'use client';

import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Link } from '@heroui/react';

export function Header() {
  return (
    <Navbar isBordered className="bg-white/80 backdrop-blur-sm">
      <NavbarBrand>
        <Link href="/" className="font-bold text-xl text-primary">
          WebTools
        </Link>
      </NavbarBrand>
      <NavbarContent justify="end">
        <NavbarItem>
          <Link href="/" className="text-gray-600 hover:text-primary transition-colors">
            首页
          </Link>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}
