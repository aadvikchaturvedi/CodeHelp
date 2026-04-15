import React from 'react';
import SideBar from '@/components/layouts/SideBar'; 
import Workspace from '@/components/layouts/Workspace'; 
export default function MainArea() {
  return (
    <div className='flex'>
      <SideBar />
      <Workspace />
    </div>
  )
}
