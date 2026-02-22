"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Upload } from "lucide-react";

export default function EditProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        address: "",
        contactNumber: ""
    });
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [newImages, setNewImages] = useState<File[]>([]); // Not implementing preview for new images to keep simple, but could.

    useEffect(() => {
        const fetchSalon = async () => {
            try {
                const { data } = await api.get("/salons/me");

                if (!data) {
                    console.warn("No salon found, redirecting to onboarding");
                    router.push("/dashboard/provider/onboarding");
                    return;
                }

                setFormData({
                    name: data.name,
                    description: data.description,
                    address: data.address,
                    contactNumber: data.contactNumber
                });
                setExistingImages(data.images || []);
            } catch (error: any) {
                console.error("Failed to fetch salon for edit", error);

                // Handle Cross-Tab Role Switch / 403 Conflict
                if (error.response?.status === 403 || error.response?.status === 401) {
                    const storedUser = localStorage.getItem('user');
                    if (storedUser) {
                        try {
                            const user = JSON.parse(storedUser);
                            // If user is no longer a provider (e.g. switched to customer in another tab)
                            if (user.role !== 'provider') {
                                // Force reload or redirect to clear stale state
                                console.warn("Role mismatch detected. Redirecting.");
                                window.location.href = '/';
                                return;
                            }
                        } catch (e) {
                            console.error('Error parsing user', e);
                        }
                    }
                    // If checks fail or user is null, basic redirect
                    router.push('/auth/login');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchSalon();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);

        const submitData = new FormData();
        submitData.append('name', formData.name);
        submitData.append('description', formData.description);
        submitData.append('address', formData.address);
        submitData.append('contactNumber', formData.contactNumber);

        // Append existing images that weren't deleted
        // Serialize existing images to JSON string to preserve array structure in FormData
        submitData.append('existingImages', JSON.stringify(existingImages));

        // Append new files (the input name must match backend multer 'images')
        // Note: If using multiple file input, we can capture them. 
        // Since input type='file' is uncontrolled usually, we can target it by ID or Name if not using state, 
        // but better to use the file input directly in the form submission or state.
        // Let's rely on the form element for file input, or better, use state if we wanted previews.
        // For simplicity, I'll grab the file input from the form directly as before, BUT
        // wait, we can't easily "append" to that file list if we want to "add more".
        // Standard approach: The <input type="file" multiple /> allows selecting multiple NEW files.
        // We already have `existingImages` handling the "keeping old ones" logic.
        // So the user just selects NEW files to ADD.
        const fileInput = (document.getElementById('new-images') as HTMLInputElement);
        console.log('📸 File Input Debug:', fileInput);
        console.log('📸 Files selected:', fileInput?.files);

        if (fileInput && fileInput.files) {
            console.log('📸 Appending', fileInput.files.length, 'files to FormData');
            for (let i = 0; i < fileInput.files.length; i++) {
                submitData.append('images', fileInput.files[i]);
                console.log('📸 Appended file:', fileInput.files[i].name);
            }
        }

        try {
            console.log('📸 Submitting FormData...');
            await api.post("/salons", submitData);
            router.push("/dashboard/provider/profile");
        } catch (error) {
            console.error("Failed to update salon", error);
            alert("Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const removeExistingImage = (urlToRemove: string) => {
        setExistingImages(existingImages.filter(url => url !== urlToRemove));
    }

    if (loading) return <div className="p-4 text-sm">Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-4 md:space-y-8 p-4 md:p-0">
            <div>
                <h2 className="text-xl md:text-3xl font-bold tracking-tight">Edit Profile</h2>
                <p className="text-muted-foreground text-xs md:text-sm mt-0.5">Update your salon info</p>
            </div>

            <div className="glass-card p-4 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                    <div className="space-y-1.5 md:space-y-2">
                        <label className="text-xs md:text-sm font-medium">Salon Name</label>
                        <Input name="name" value={formData.name} onChange={handleChange} className="h-9" required />
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                        <label className="text-xs md:text-sm font-medium">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div className="space-y-1.5 md:space-y-2">
                            <label className="text-xs md:text-sm font-medium">Address</label>
                            <Input name="address" value={formData.address} onChange={handleChange} className="h-9" required />
                        </div>
                        <div className="space-y-1.5 md:space-y-2">
                            <label className="text-xs md:text-sm font-medium">Contact Number</label>
                            <Input name="contactNumber" value={formData.contactNumber} onChange={handleChange} className="h-9" required />
                        </div>
                    </div>

                    <div className="space-y-3 md:space-y-4 pt-3 md:pt-4 border-t border-white/10">
                        <h3 className="text-sm md:text-lg font-medium">Gallery</h3>

                        {/* Existing Images - 2 cols on mobile, 3 on larger */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-4">
                            {existingImages.map((img, i) => (
                                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10">
                                    <img src={img} alt="Salon view" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeExistingImage(img)}
                                        className="absolute top-1.5 right-1.5 md:top-2 md:right-2 p-1 bg-red-500 rounded-full text-white opacity-70 md:opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remove Image"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add New Images */}
                        <div className="space-y-1.5 md:space-y-2">
                            <label className="text-xs md:text-sm font-medium">Add New Images</label>
                            <Input
                                id="new-images"
                                type="file"
                                multiple
                                accept="image/*"
                                className="cursor-pointer file:cursor-pointer text-xs md:text-sm h-9"
                            />
                            <p className="text-[10px] md:text-xs text-muted-foreground">Select multiple files to add.</p>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 md:gap-4 pt-3 md:pt-4">
                        <Button type="button" variant="ghost" size="sm" className="text-xs md:text-sm" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" disabled={saving} size="sm" className="text-xs md:text-sm">
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
