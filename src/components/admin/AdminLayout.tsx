import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, ListChecks, Users, Wrench, Settings, LogOut, Sparkles, Inbox, FileText, Mail, ShoppingBag, Package, ShoppingCart, MessageSquare, Boxes, Tag, Activity, Lightbulb } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarFooter, SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/requests", label: "Requests", icon: Inbox },
  { to: "/admin/quotes", label: "Quotes", icon: FileText },
  { to: "/admin/jobs", label: "Jobs", icon: ListChecks },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/services", label: "Services", icon: Wrench },
  { to: "/admin/products", label: "Shop Products", icon: ShoppingBag },
  { to: "/admin/accessories", label: "Accessories", icon: Boxes },
  { to: "/admin/promo-codes", label: "Promo Codes", icon: Tag },
  { to: "/admin/shop-orders", label: "Shop Orders", icon: Package },
  { to: "/admin/abandoned-carts", label: "Abandoned Carts", icon: ShoppingCart },
  { to: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { to: "/admin/email-preview", label: "Email Preview", icon: Mail },
  { to: "/admin/status", label: "System Status", icon: Activity },
  { to: "/admin/ai", label: "AI Assistant", icon: Sparkles },
  { to: "/admin/ai/suggestions", label: "AI Suggestions", icon: Lightbulb },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/auth");
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-display tracking-wide">Clean My Kicks</span>
                <span className="text-[10px] text-muted-foreground uppercase">Admin</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {nav.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          className={({ isActive }) =>
                            `flex items-center gap-2 ${isActive ? "bg-primary/10 text-primary font-medium" : ""}`
                          }
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t">
            <div className="px-2 py-1 text-xs text-muted-foreground truncate group-data-[collapsible=icon]:hidden">
              {user?.email}
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="justify-start">
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b flex items-center px-3 sticky top-0 bg-background/95 backdrop-blur z-10">
            <SidebarTrigger />
            <div className="ml-3 font-display text-lg tracking-wide">Admin</div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}