"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function ServicesPage() {
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [newService, setNewService] = useState({
        name: "",
        duration: "",
        price: "",
        category: "Hair",
        icon: "Scissors"
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    const [salon, setSalon] = useState<any>(null);

    const fetchSalon = async () => {
        try {
            const { data } = await api.get("/salons/me");
            setSalon(data);
        } catch (error) {
            console.error("Failed to fetch salon");
        }
    };

    const fetchServices = async () => {
        try {
            const { data } = await api.get("/services");
            setServices(data);
        } catch (error) {
            console.error("Failed to fetch services", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSalon();
        fetchServices();
    }, []);

    const handleSaveService = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/services/${editingId}`, newService);
            } else {
                await api.post("/services", newService);
            }
            setOpen(false);
            fetchServices();
            setNewService({ name: "", duration: "", price: "", category: "Hair", icon: "Scissors" });
            setEditingId(null);
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to save service.");
        }
    };

    const handleEdit = (service: any) => {
        setNewService({
            name: service.name,
            duration: service.duration,
            price: service.price,
            category: service.category,
            icon: service.icon || "Scissors"
        });
        setEditingId(service._id);
        setOpen(true);
    };

    const openForNew = () => {
        setNewService({ name: "", duration: "", price: "", category: "Hair", icon: "Scissors" });
        setEditingId(null);
        setOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this service?")) return;
        try {
            await api.delete(`/services/${id}`);
            fetchServices();
        } catch (error) {
            console.error("Failed to delete service", error);
        }
    };

    return (
        <div className="space-y-4 md:space-y-6 p-4 md:p-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-xl md:text-3xl font-bold tracking-tight">Services</h2>

                {salon?.status === 'approved' ? (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openForNew} size="sm" className="text-xs md:text-sm">
                                <Plus className="mr-1.5 h-4 w-4" /> Add Service
                            </Button>
                        </DialogTrigger>
                        {/* Dialog Content */}
                        <DialogContent className="max-w-[95vw] sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editingId ? "Edit Service" : "Add New Service"}</DialogTitle>
                                <DialogDescription>
                                    {editingId ? "Update service details." : "Create a new service offering for your salon."}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSaveService} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input id="name" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} placeholder="e.g. Haircut" required />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="price">Price (₹)</Label>
                                        <Input id="price" type="number" value={newService.price} onChange={(e) => setNewService({ ...newService, price: e.target.value })} placeholder="500" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="duration">Duration (min)</Label>
                                        <Input id="duration" type="number" value={newService.duration} onChange={(e) => setNewService({ ...newService, duration: e.target.value })} placeholder="30" required />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select value={newService.category} onValueChange={(val) => setNewService({ ...newService, category: val })}>
                                        <SelectTrigger className="w-full"><SelectValue placeholder="Select a category" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="Hair">Hair</SelectItem>
                                                <SelectItem value="Face">Face</SelectItem>
                                                <SelectItem value="Body">Body</SelectItem>
                                                <SelectItem value="Nails">Nails</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Icon Selector */}
                                <div className="space-y-2 pt-3 border-t border-border/50">
                                    <Label className="text-sm font-medium">Choose Icon</Label>
                                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                                        {[
                                            "Scissors", "Droplet", "Wind", "Sparkles", "Palette",
                                            "Feather", "Sun", "Crown", "Flower", "Smile",
                                            "Heart", "Gem", "Zap", "Timer", "User"
                                        ].map((iconName) => {
                                            // Dynamically require icon for display
                                            const Icon = (require('lucide-react') as any)[iconName] || require('lucide-react').Scissors;
                                            return (
                                                <div
                                                    key={iconName}
                                                    onClick={() => setNewService({ ...newService, icon: iconName })}
                                                    className={`
                                                        aspect-square flex items-center justify-center rounded-lg cursor-pointer transition-all border
                                                        ${newService.icon === iconName
                                                            ? 'bg-primary text-primary-foreground border-primary'
                                                            : 'bg-muted/50 border-transparent hover:bg-muted hover:border-border'}
                                                    `}
                                                    title={iconName}
                                                >
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <DialogFooter><Button type="submit">Save Service</Button></DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                ) : (
                    <Button disabled variant="secondary" size="sm" className="text-xs md:text-sm" title="Salon must be approved">
                        Waiting for Approval
                    </Button>
                )}
            </div>

            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                    <div key={service._id} className="glass-card p-4 md:p-6 flex flex-col justify-between hover:border-primary/20 transition-all">
                        <div>
                            <div className="flex justify-between items-start gap-2">
                                <h3 className="font-semibold text-base md:text-lg truncate">{service.name}</h3>
                                <span className="text-[10px] md:text-xs bg-secondary px-2 py-0.5 rounded-md text-muted-foreground shrink-0">{service.category}</span>
                            </div>
                            <div className="flex gap-3 mt-2 text-xs md:text-sm text-muted-foreground">
                                <span>₹{service.price}</span>
                                <span className="text-muted-foreground/50">|</span>
                                <span>{service.duration} mins</span>
                            </div>
                        </div>
                        <div className="mt-3 md:mt-4 flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => handleEdit(service)}>Edit</Button>
                            <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(service._id)}>Delete</Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
