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
      {/* Luxury car icon for admin */}
      <path d="M17 3.34a10 10 0 0 1-5 0" />
      <path d="M21 13.8v2a3 3 0 0 1-2.99 3H5.99a3 3 0 0 1-3-3v-2l.3-3c.1-1 .9-1.8 1.9-1.8h12.6c1 0 1.8.8 1.9 1.8l.3 3Z" />
      <path d="M17 17l-5-4-5 4" />
      <path d="M5 11V8" />
      <path d="M19 11V8" />
      <path d="M5 13h14" />
      <circle cx="6.5" cy="16.5" r="1.5" />
      <circle cx="17.5" cy="16.5" r="1.5" />
      <path d="M10 17h4" />
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
      {/* Dealership icon */}
      <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
      <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" />
      <path d="M8 18h8" />
      <path d="M7 14h10" />
      <path d="M7 4v2" />
      <path d="M17 4v2" />
      <path d="M12 4v8" />
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
      {/* Car with price tag icon */}
      <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M5 9l2 -4h8l4 5h1a2 2 0 0 1 2 2v4" />
      <path d="M9 17h6" />
      <path d="M14 9h-5" />
      <path d="M18 9v-3m3 6h-3" />
    </svg>
  );
}
