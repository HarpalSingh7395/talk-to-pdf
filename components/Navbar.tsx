import { Bot, HouseIcon, InboxIcon, SparklesIcon, ZapIcon, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import UserMenu from "./navbar-components/user-menu"

// Navigation links array
const navigationLinks = [
  { href: "#", label: "Home", icon: HouseIcon, active: true },
  { href: "#", label: "Inbox", icon: InboxIcon },
  { href: "#", label: "Insights", icon: ZapIcon },
]

export default function Header() {
  return (
    <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50 px-4 md:px-6">
      <div className="flex h-16 items-center justify-between gap-4">
        {/* Left side - Logo */}
        <div className="flex items-center">
          <a href="#" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">Talk To PDF</span>
          </a>
        </div>

        {/* Middle - Navigation (Desktop) */}
        <div className="hidden md:flex items-center">
          {/* <NavigationMenu className="max-w-none">
            <NavigationMenuList className="gap-8">
              {navigationLinks.map((link, index) => {
                const Icon = link.icon
                return (
                  <NavigationMenuItem key={index}>
                    <NavigationMenuLink
                      active={link.active}
                      href={link.href}
                      className={`flex items-center gap-2 py-2 px-3 rounded-lg font-medium transition-colors ${
                        link.active 
                          ? 'bg-blue-50 text-blue-600' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon
                        size={16}
                        className={link.active ? 'text-blue-600' : 'text-gray-500'}
                        aria-hidden="true"
                      />
                      <span>{link.label}</span>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )
              })}
            </NavigationMenuList>
          </NavigationMenu> */}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-4">
          {/* Mobile menu trigger */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className="group size-8 md:hidden"
                variant="ghost"
                size="icon"
              >
                <svg
                  className="pointer-events-none"
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 12L20 12"
                    className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
                  />
                  <path
                    d="M4 12H20"
                    className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
                  />
                  <path
                    d="M4 12H20"
                    className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
                  />
                </svg>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-2 md:hidden mt-2">
              <NavigationMenu className="max-w-none *:w-full">
                <NavigationMenuList className="flex-col items-start gap-1">
                  {navigationLinks.map((link, index) => {
                    const Icon = link.icon
                    return (
                      <NavigationMenuItem key={index} className="w-full">
                        <NavigationMenuLink
                          href={link.href}
                          className={`flex items-center gap-3 py-2.5 px-3 rounded-lg w-full font-medium transition-colors ${
                            link.active 
                              ? 'bg-blue-50 text-blue-600' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                          active={link.active}
                        >
                          <Icon
                            size={16}
                            className={link.active ? 'text-blue-600' : 'text-gray-500'}
                            aria-hidden="true"
                          />
                          <span>{link.label}</span>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    )
                  })}
                </NavigationMenuList>
              </NavigationMenu>
            </PopoverContent>
          </Popover>

          {/* User menu */}
          <UserMenu />
          
          {/* Upgrade button */}
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors"
          >
            <SparklesIcon
              className="opacity-80 mr-2"
              size={16}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Upgrade</span>
          </Button>
        </div>
      </div>
    </header>
  )
}