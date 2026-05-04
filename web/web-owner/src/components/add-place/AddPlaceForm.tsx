import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, ImagePlus, CheckCircle, Info, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { addPlaceSchema, type AddPlaceFormValues } from "./schema";
import { createPlace, searchCategories } from "@keodi/shared";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AddPlaceForm() {
  const navigate = useNavigate();
  const [featureImage, setFeatureImage] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "";

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [mainCatQuery, setMainCatQuery] = useState("");
  const [mainCategories, setMainCategories] = useState<{id: string, name: string}[]>([]);
  const [secCatQuery, setSecCatQuery] = useState("");
  const [secCategories, setSecCategories] = useState<{id: string, name: string}[]>([]);
  const [showMainCatDropdown, setShowMainCatDropdown] = useState(false);
  const [showSecCatDropdown, setShowSecCatDropdown] = useState(false);
  const [selectedMainCat, setSelectedMainCat] = useState<{id: string, name: string} | null>(null);
  const [selectedSecCats, setSelectedSecCats] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (mainCatQuery.trim().length > 1) {
        try { setMainCategories(await searchCategories(mainCatQuery, baseUrl, 10)); }
        catch (err) { console.error(err); }
      } else {
        setMainCategories([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [mainCatQuery, baseUrl]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (secCatQuery.trim().length > 1) {
        try { setSecCategories(await searchCategories(secCatQuery, baseUrl, 10)); }
        catch (err) { console.error(err); }
      } else {
        setSecCategories([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [secCatQuery, baseUrl]);

  const form = useForm<AddPlaceFormValues>({
    resolver: zodResolver(addPlaceSchema),
    defaultValues: {
      name: "",
      description: "",
      street: "",
      ward: "",
      city: "",
      countryCode: "VN",
      latitude: 10.762622,
      longitude: 106.660172,
      mainCategoryId: "",
      secondaryCategoryIds: [],
      phoneNumber: "",
      website: "",
      googleMapLink: "",
      openingHours: [],
    },
    mode: "onChange",
  });

  const { fields: openingHoursFields, append: appendHour, remove: removeHour } = useFieldArray({
    control: form.control,
    name: "openingHours",
  });

  function LocationMap() {
    const map = useMapEvents({
      click(e) {
        form.setValue("latitude", e.latlng.lat, { shouldValidate: true });
        form.setValue("longitude", e.latlng.lng, { shouldValidate: true });
      },
    });
    
    useEffect(() => {
      if (navigator.geolocation && form.getValues("latitude") === 10.762622) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          form.setValue("latitude", lat);
          form.setValue("longitude", lng);
          map.flyTo([lat, lng], 13);
        });
      }
    }, [map]);

    const lat = form.watch("latitude");
    const lng = form.watch("longitude");

    return lat && lng ? <Marker position={[lat, lng]}></Marker> : null;
  }

  const handleNext = async () => {
    let fieldsToValidate: any[] = [];
    if (currentStep === 1) {
      fieldsToValidate = ["name", "description"];
      if (!featureImage) {
        setSubmitError("Feature Image is required.");
        return;
      }
    } else if (currentStep === 2) {
      fieldsToValidate = ["street", "ward", "city", "latitude", "longitude"];
    } else if (currentStep === 3) {
      fieldsToValidate = ["mainCategoryId", "secondaryCategoryIds", "phoneNumber", "website"];
    }

    setSubmitError(null);
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const onSubmit = async (data: AddPlaceFormValues) => {
    // Guard: only allow final submission on the last step
    if (currentStep !== totalSteps) return;

    try {
      setSubmitError(null);
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (key === "secondaryCategoryIds" || key === "openingHours") {
            if ((value as any).length > 0) {
              formData.append(key, JSON.stringify(value));
            }
          } else {
            formData.append(key, value.toString());
          }
        }
      });
      if (featureImage) {
        formData.append("featureImage", featureImage);
      }

      await createPlace(formData, baseUrl);
      setSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to create place.");
    }
  };

  // Always block Enter from triggering form submission — user must click the button explicitly
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  const watchMainCat = form.watch("mainCategoryId");
  const watchSecCats = form.watch("secondaryCategoryIds") || [];

  if (success) {
    return (
      <div className="min-h-screen bg-white sm:bg-[#fafafa] flex items-center justify-center p-4 py-8">
        <Card className="w-full max-w-xl bg-white ring-0 sm:ring-1 shadow-none sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-none sm:border-solid sm:border-neutral-200/60 p-6 sm:p-10 rounded-none sm:rounded-2xl text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-2xl font-semibold mb-2">Place Submitted!</h1>
          <p className="text-neutral-600 mb-8">
            Your new place has been submitted and is currently UNDER REVIEW. We will notify you once it's approved.
          </p>
          <Button onClick={() => navigate("/home")} className="bg-black hover:bg-neutral-800 text-white h-10 px-8 rounded-lg text-xs font-semibold tracking-wider uppercase">
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white sm:bg-[#fafafa] p-4 py-8 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate("/home")} className="flex items-center text-sm font-medium text-neutral-600 hover:text-black mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </button>

        <Card className="bg-white ring-0 sm:ring-1 shadow-none sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-none sm:border-solid sm:border-neutral-200/60 p-6 sm:p-8 rounded-none sm:rounded-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 mb-2">
                Add a New Place
              </h1>
              <p className="text-sm text-neutral-600">
                Step {currentStep} of {totalSteps}
              </p>
            </div>
            
            {/* Step Indicators */}
            <div className="hidden sm:flex gap-2">
              {[1, 2, 3, 4].map(step => (
                <div 
                  key={step} 
                  className={`h-2 w-12 rounded-full transition-colors ${currentStep >= step ? 'bg-black' : 'bg-neutral-200'}`}
                />
              ))}
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} onKeyDown={handleFormKeyDown} className="space-y-6">
              
              {/* STEP 1: Basic Info */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-neutral-700">Basic Information</h3>
                  
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Business Name *</FormLabel>
                      <FormControl><Input placeholder="Sunset Coffee" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Description</FormLabel>
                      <FormControl><Input placeholder="A brief description of your business" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="pt-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-2">Feature Image *</h3>
                    <label htmlFor="feature-image" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 rounded-xl cursor-pointer bg-neutral-50 hover:bg-neutral-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImagePlus className="w-8 h-8 text-neutral-400 mb-2" />
                        <p className="text-sm text-neutral-600">
                          {featureImage ? featureImage.name : "Click to upload an image"}
                        </p>
                      </div>
                      <input id="feature-image" type="file" className="hidden" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files.length > 0) setFeatureImage(e.target.files[0]); }} />
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 2: Location */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-neutral-700">Location Details</h3>
                  
                  <div>
                    <div className="h-64 rounded-xl overflow-hidden border border-neutral-200 z-0 relative mb-2">
                      <MapContainer center={[10.762622, 106.660172]} zoom={13} style={{ height: "100%", width: "100%", zIndex: 0 }}>
                        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <LocationMap />
                      </MapContainer>
                      <div className="absolute top-2 right-2 bg-white/90 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-700 shadow-sm border border-neutral-200 z-[1000] pointer-events-none">
                        Click map to set precise location
                      </div>
                    </div>
                    <p className="text-xs text-neutral-500 mb-4">The map automatically sets the coordinates for your business.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField control={form.control} name="street" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Street Address *</FormLabel>
                        <FormControl><Input placeholder="255 Do Xuan Hop" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="ward" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Ward *</FormLabel>
                        <FormControl><Input placeholder="Phuoc Long B" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">City / District *</FormLabel>
                        <FormControl><Input placeholder="Thu Duc City" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              )}

              {/* STEP 3: Categories & Details */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-neutral-700">Categories & Contact</h3>
                  
                  <FormField control={form.control} name="mainCategoryId" render={() => (
                    <FormItem className="relative z-20">
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Main Category *</FormLabel>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <Input 
                          placeholder="Search categories..." 
                          className="pl-9"
                          value={mainCatQuery}
                          onChange={(e) => {
                            setMainCatQuery(e.target.value);
                            setShowMainCatDropdown(true);
                            setShowSecCatDropdown(false);
                          }}
                          onFocus={() => {
                            setShowMainCatDropdown(true);
                            setShowSecCatDropdown(false);
                          }}
                        />
                      </div>
                      {showMainCatDropdown && mainCategories.length > 0 && (
                        <div className="absolute w-full mt-1 bg-white border border-neutral-200 shadow-lg rounded-lg max-h-48 overflow-y-auto">
                          {mainCategories.map((c) => (
                            <div 
                              key={c.id} 
                              className="px-4 py-2 hover:bg-neutral-100 cursor-pointer text-sm"
                              onClick={() => {
                                form.setValue("mainCategoryId", c.id, { shouldValidate: true });
                                setSelectedMainCat(c);
                                setMainCatQuery(c.name);
                                setShowMainCatDropdown(false);
                              }}
                            >
                              {c.name}
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedMainCat && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-neutral-500">Selected:</span>
                          <div className="flex items-center gap-1 bg-black text-white text-xs px-2.5 py-1 rounded-full">
                            {selectedMainCat.name}
                            <X
                              className="w-3 h-3 ml-1 cursor-pointer opacity-70 hover:opacity-100"
                              onClick={() => {
                                form.setValue("mainCategoryId", "", { shouldValidate: true });
                                setSelectedMainCat(null);
                                setMainCatQuery("");
                              }}
                            />
                          </div>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="secondaryCategoryIds" render={() => (
                    <FormItem className="relative z-10">
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Secondary Categories</FormLabel>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <Input 
                          placeholder="Search secondary categories..." 
                          className="pl-9"
                          value={secCatQuery}
                          onChange={(e) => {
                            setSecCatQuery(e.target.value);
                            setShowSecCatDropdown(true);
                            setShowMainCatDropdown(false);
                          }}
                          onFocus={() => {
                            setShowSecCatDropdown(true);
                            setShowMainCatDropdown(false);
                          }}
                        />
                      </div>
                      {showSecCatDropdown && secCategories.length > 0 && (
                        <div className="absolute w-full mt-1 bg-white border border-neutral-200 shadow-lg rounded-lg max-h-48 overflow-y-auto">
                          {secCategories.map((c) => (
                            <div 
                              key={c.id} 
                              className={`px-4 py-2 hover:bg-neutral-100 cursor-pointer text-sm ${
                                watchSecCats.includes(c.id) ? 'opacity-40 pointer-events-none' : ''
                              }`}
                              onClick={() => {
                                if (!watchSecCats.includes(c.id)) {
                                  form.setValue("secondaryCategoryIds", [...watchSecCats, c.id]);
                                  setSelectedSecCats(prev => [...prev, c]);
                                }
                                setShowSecCatDropdown(false);
                                setSecCatQuery("");
                              }}
                            >
                              {c.name}
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedSecCats.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {selectedSecCats.map(cat => (
                            <div key={cat.id} className="bg-neutral-100 text-neutral-700 text-xs px-2.5 py-1 rounded-full flex items-center font-medium">
                              {cat.name}
                              <X 
                                className="w-3 h-3 ml-2 cursor-pointer text-neutral-400 hover:text-red-500" 
                                onClick={() => {
                                  form.setValue("secondaryCategoryIds", watchSecCats.filter(i => i !== cat.id));
                                  setSelectedSecCats(prev => prev.filter(c => c.id !== cat.id));
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Phone Number</FormLabel>
                        <FormControl><Input placeholder="+84 123 456 789" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="website" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Website</FormLabel>
                        <FormControl><Input placeholder="https://example.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              )}

              {/* STEP 4: Opening Hours */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-neutral-700">Operating Hours</h3>
                  <div className="space-y-4">
                    {DAYS.map((dayName, dayIndex) => {
                      const existingHourIndex = openingHoursFields.findIndex(h => h.dayOfWeek === dayIndex);
                      const isOpen = existingHourIndex !== -1;
                      
                      return (
                        <div key={dayIndex} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-neutral-50 rounded-lg">
                          <div className="flex items-center justify-between w-full sm:w-32">
                            <div className="font-medium text-sm text-neutral-700">{dayName}</div>
                            <label className="flex items-center gap-2 cursor-pointer sm:hidden">
                              <span className="text-xs text-neutral-600">{isOpen ? "Open" : "Closed"}</span>
                              <input 
                                type="checkbox" 
                                checked={isOpen}
                                onChange={(e) => {
                                  if (e.target.checked) appendHour({ dayOfWeek: dayIndex, openTime: "09:00:00", closeTime: "17:00:00" });
                                  else removeHour(existingHourIndex);
                                }}
                                className="rounded border-neutral-300"
                              />
                            </label>
                          </div>
                          
                          <label className="hidden sm:flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={isOpen}
                              onChange={(e) => {
                                if (e.target.checked) appendHour({ dayOfWeek: dayIndex, openTime: "09:00:00", closeTime: "17:00:00" });
                                else removeHour(existingHourIndex);
                              }}
                              className="rounded border-neutral-300"
                            />
                            <span className="text-xs text-neutral-600 w-10">{isOpen ? "Open" : "Closed"}</span>
                          </label>

                          {isOpen && (
                            <div className="flex items-center gap-2 mt-2 sm:mt-0">
                              <Input 
                                type="time" 
                                value={openingHoursFields[existingHourIndex].openTime.slice(0, 5)}
                                onChange={(e) => {
                                  const newHours = [...form.getValues("openingHours")!];
                                  newHours[existingHourIndex].openTime = e.target.value + ":00";
                                  form.setValue("openingHours", newHours);
                                }}
                                className="w-32 h-9 text-xs bg-white" 
                              />
                              <span className="text-xs text-neutral-500">to</span>
                              <Input 
                                type="time" 
                                value={openingHoursFields[existingHourIndex].closeTime.slice(0, 5)}
                                onChange={(e) => {
                                  const newHours = [...form.getValues("openingHours")!];
                                  newHours[existingHourIndex].closeTime = e.target.value + ":00";
                                  form.setValue("openingHours", newHours);
                                }}
                                className="w-32 h-9 text-xs bg-white" 
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {submitError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg flex items-start">
                  <Info className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                  {submitError}
                </div>
              )}

              {/* Navigation Controls */}
              <div className="pt-6 border-t border-neutral-100 flex justify-between items-center mt-8">
                {currentStep > 1 ? (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleBack}
                    className="h-10 px-6 rounded-lg text-xs font-semibold tracking-wider uppercase"
                  >
                    Back
                  </Button>
                ) : (
                  <div></div> // Spacer
                )}

                {currentStep < totalSteps ? (
                  <Button 
                    key="next-step-btn"
                    type="button" 
                    onClick={handleNext}
                    className="bg-black hover:bg-neutral-800 text-white h-10 px-8 rounded-lg text-xs font-semibold tracking-wider uppercase"
                  >
                    Next Step
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                ) : (
                  <Button 
                    key="submit-btn"
                    type="button"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={form.formState.isSubmitting}
                    className="bg-black hover:bg-neutral-800 text-white h-10 px-8 rounded-lg text-xs font-semibold tracking-wider uppercase"
                  >
                    {form.formState.isSubmitting ? "Submitting..." : "Add Place"}
                    <CheckCircle className="ml-2 w-4 h-4" />
                  </Button>
                )}
              </div>

            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
