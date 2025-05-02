import React from "react";
import { Label } from "@/components/ui/label";

interface RoleOption {
  id: string;
  value: string;
  icon: React.ReactNode;
  label: string;
}

interface RoleSelectorProps {
  name: string;
  selectedRole: string | null;
  onChange: (role: string) => void;
  error?: string;
}

export function RoleSelector({ 
  name, 
  selectedRole, 
  onChange, 
  error 
}: RoleSelectorProps) {
  const roleOptions: RoleOption[] = [
    {
      id: `${name}RoleAdmin`,
      value: "admin",
      icon: <AdminIcon className="mr-1 h-4 w-4" />,
      label: "Admin"
    },
    {
      id: `${name}RoleDealer`,
      value: "dealer",
      icon: <DealerIcon className="mr-1 h-4 w-4" />,
      label: "Dealer"
    },
    {
      id: `${name}RoleSales`,
      value: "sales",
      icon: <SalesIcon className="mr-1 h-4 w-4" />,
      label: "Sales"
    }
  ];

  return (
    <div className="space-y-2">
      <Label className="block text-sm font-medium text-gray-700">Select Role</Label>
      <div className="grid grid-cols-3 gap-3">
        {roleOptions.map((option) => (
          <div key={option.id}>
            <input 
              type="radio" 
              id={option.id} 
              name={name} 
              value={option.value} 
              checked={selectedRole === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only peer" 
            />
            <label 
              htmlFor={option.id} 
              className={`role-option ${selectedRole === option.value ? 'role-option-selected' : ''}`}
            >
              {option.icon}
              <span>{option.label}</span>
            </label>
          </div>
        ))}
      </div>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}

// Icons for roles
function AdminIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function DealerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
      <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" />
      <path d="M9 14v2" />
      <path d="M15 14v2" />
      <path d="M9 3v2" />
      <path d="M15 3v2" />
    </svg>
  );
}

function SalesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M21 15V6" />
      <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path d="M12 13V4" />
      <path d="M9.5 16a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path d="M3 3v10" />
      <path d="M3 10a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0-5 0Z" />
    </svg>
  );
}
