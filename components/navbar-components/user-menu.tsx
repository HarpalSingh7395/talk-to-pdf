import React from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, Settings, User } from 'lucide-react'
import { SignedIn, SignedOut, SignInButton, SignOutButton, useUser } from '@clerk/nextjs'

export default function UserMenu() {
  const { user } = useUser();
  return (
    <>
      <SignedIn>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="relative"
              aria-label="Open notifications"
            >
              <Avatar>
                <AvatarImage src={user?.imageUrl} alt="Kelly King" />
                <AvatarFallback>{user?.fullName}</AvatarFallback>
              </Avatar>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1">
            <div className='flex flex-col items-start'>
              <Button size={"sm"} variant={"ghost"} className='w-full justify-start'><User className='h-4 w-4 inline mr-2' /> Profile</Button>
              <Button size={"sm"} variant={"ghost"} className='w-full justify-start'><Settings className='h-4 w-4 inline mr-2' />Settings</Button>
              <SignOutButton>
                <Button size={"sm"} variant={"ghost"} className='w-full justify-start'>
                  <LogOut className='h-4 w-4 inline mr-2' /> Logout
                </Button>
              </SignOutButton>
            </div>
          </PopoverContent>
        </Popover>
      </SignedIn>
      <SignedOut>
        <SignInButton>
          <Button>
            Sign In
          </Button>
        </SignInButton>
      </SignedOut>
    </>
  )
}
