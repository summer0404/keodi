import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, CheckCircle, Store, MapPin, Building, ArrowRight, Phone, Globe, Star, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchPlaces, createOwnershipClaim } from "@keodi/shared";
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

type Place = {
  id: string;
  name: string;
  fullAddress: string | null;
  street?: string | null;
  ward?: string | null;
  city?: string | null;
  rating: number;
  categories: { id: string; name: string }[];
  ownerId: string | null;
  phoneNumber?: string | null;
  website?: string | null;
  featureImageUrl?: string | null;
};

export default function ClaimPlaceFlow() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Form states
  const [relationship, setRelationship] = useState("");
  const [proofUrls, setProofUrls] = useState<string[]>([""]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "";

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.error("Error getting location", err);
          setUserLocation({ lat: 10.762622, lng: 106.660172 });
        }
      );
    } else {
      setUserLocation({ lat: 10.762622, lng: 106.660172 });
    }
  }, []);

  function LocationMarker() {
    const map = useMapEvents({
      click(e) {
        setUserLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    useEffect(() => {
      if (userLocation) {
        map.flyTo(userLocation, map.getZoom());
      }
    }, [userLocation, map]);
    return userLocation === null ? null : (
      <Marker position={userLocation}></Marker>
    );
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length > 2) {
        handleSearch(query, userLocation);
      } else {
        setPlaces([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, userLocation]);

  const handleSearch = async (searchQuery: string, loc: { lat: number; lng: number } | null) => {
    try {
      setLoadingSearch(true);
      const res = await searchPlaces(searchQuery, baseUrl, loc?.lat, loc?.lng);
      setPlaces(res.places || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlace) return;
    
    const urls = proofUrls.map(u => u.trim()).filter(Boolean);
    if (!relationship.trim() || urls.length === 0) {
      setError("Relationship and at least one Proof URL are required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await createOwnershipClaim({
        placeId: selectedPlace.id,
        relationship,
        proofDocumentUrls: urls,
        note: note.trim() || undefined,
      }, baseUrl);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit claim");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white sm:bg-[#fafafa] flex items-center justify-center p-4 py-8">
        <Card className="w-full max-w-xl bg-white ring-0 sm:ring-1 shadow-none sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-none sm:border-solid sm:border-neutral-200/60 p-6 sm:p-10 rounded-none sm:rounded-2xl text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-2xl font-semibold mb-2">Claim Submitted!</h1>
          <p className="text-neutral-600 mb-8">
            Your ownership claim for {selectedPlace?.name} has been sent for review. We will notify you once it has been processed.
          </p>
          <Button
            onClick={() => navigate("/home")}
            className="bg-black hover:bg-neutral-800 text-white h-10 px-8 rounded-lg text-xs font-semibold tracking-wider uppercase"
          >
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white sm:bg-[#fafafa] p-4 py-8 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => selectedPlace ? setSelectedPlace(null) : navigate("/home")}
          className="flex items-center text-sm font-medium text-neutral-600 hover:text-black mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {selectedPlace ? "Back to Search" : "Back to Home"}
        </button>

        <Card className="bg-white ring-0 sm:ring-1 shadow-none sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-none sm:border-solid sm:border-neutral-200/60 p-6 sm:p-8 rounded-none sm:rounded-2xl">
          {!selectedPlace ? (
            <div>
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 mb-2">
                  Claim an Existing Place
                </h1>
                <p className="text-sm text-neutral-600">
                  Search for your business and claim ownership to manage its presence on Keodi.
                </p>
              </div>

              {userLocation && (
                <div className="h-48 mb-6 rounded-xl overflow-hidden border border-neutral-200 z-0 relative">
                  <MapContainer 
                    center={[userLocation.lat, userLocation.lng]} 
                    zoom={13} 
                    style={{ height: "100%", width: "100%", zIndex: 0 }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker />
                  </MapContainer>
                  <div className="absolute top-2 right-2 bg-white/90 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-700 shadow-sm border border-neutral-200 z-[1000] pointer-events-none">
                    Click map to refine location
                  </div>
                </div>
              )}

              <div className="relative mb-6 z-10">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by business name or address..."
                  className="pl-11 h-12 bg-neutral-50/50 text-base border-neutral-200 focus-visible:ring-neutral-900 rounded-xl"
                />
              </div>

              <div className="space-y-3">
                {loadingSearch && <p className="text-sm text-neutral-500 text-center py-4">Searching...</p>}
                
                {!loadingSearch && query.length > 2 && places.length === 0 && (
                  <div className="text-center py-8">
                    <Store className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-sm text-neutral-600">No places found for "{query}"</p>
                    <Button 
                      variant="link" 
                      onClick={() => navigate("/add-place")}
                      className="mt-2 text-blue-600"
                    >
                      Add a new place instead
                    </Button>
                  </div>
                )}

                {places.map((place) => (
                  <div 
                    key={place.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50 transition-all cursor-pointer group"
                    onClick={() => {
                      if (!place.ownerId) setSelectedPlace(place);
                    }}
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="font-semibold text-neutral-900 truncate flex items-center">
                        {place.name}
                        {place.ownerId && (
                          <span className="ml-3 inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                            Already Claimed
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center text-sm text-neutral-500 mt-1">
                        <MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                        <span className="truncate">{[place.street, place.ward, place.city].filter(Boolean).join(", ") || "No address provided"}</span>
                      </div>
                    </div>
                    {!place.ownerId && (
                      <Button 
                        variant="ghost" 
                        className="mt-3 sm:mt-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white"
                        size="sm"
                      >
                        Claim <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-8 pb-6 border-b border-neutral-100">
                <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 overflow-hidden border border-neutral-200">
                    {selectedPlace.featureImageUrl ? (
                      <img src={selectedPlace.featureImageUrl} alt={selectedPlace.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building className="w-10 h-10 text-neutral-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <h2 className="text-xl font-semibold text-neutral-900">{selectedPlace.name}</h2>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {selectedPlace.rating > 0 && (
                          <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700 border border-yellow-200">
                            <Star className="w-3.5 h-3.5 mr-1 fill-yellow-500 text-yellow-500" />
                            {selectedPlace.rating.toFixed(1)}
                          </span>
                        )}
                        {selectedPlace.categories?.slice(0, 3).map(cat => (
                          <span key={cat.id} className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 text-sm text-neutral-600">
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 text-neutral-400 shrink-0" />
                        <span>{[selectedPlace.street, selectedPlace.ward, selectedPlace.city].filter(Boolean).join(", ") || "No address provided"}</span>
                      </div>
                      {selectedPlace.phoneNumber && (
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-neutral-400 shrink-0" />
                          <span>{selectedPlace.phoneNumber}</span>
                        </div>
                      )}
                      {selectedPlace.website && (
                        <div className="flex items-center">
                          <Globe className="w-4 h-4 mr-2 text-neutral-400 shrink-0" />
                          <a href={selectedPlace.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">{selectedPlace.website}</a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmitClaim} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Verify Ownership</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="relationship">Your Relationship to the Business *</Label>
                    <Input 
                      id="relationship" 
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      placeholder="e.g. Owner, Manager, Authorized Representative" 
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Proof Documents (URLs) *</Label>
                    {proofUrls.map((url, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input 
                          value={url}
                          onChange={(e) => {
                            const newUrls = [...proofUrls];
                            newUrls[index] = e.target.value;
                            setProofUrls(newUrls);
                          }}
                          placeholder="Link to business license, etc." 
                          required={index === 0}
                        />
                        {proofUrls.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              const newUrls = proofUrls.filter((_, i) => i !== index);
                              setProofUrls(newUrls);
                            }}
                            className="text-neutral-400 hover:text-red-500 shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setProofUrls([...proofUrls, ""])}
                      className="mt-2 text-xs h-8"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add another URL
                    </Button>
                    <p className="text-xs text-neutral-500">Provide links to Google Drive, Dropbox, or public registries that prove your association.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="note">Additional Notes (Optional)</Label>
                    <Input 
                      id="note" 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Any extra information for the review team" 
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setSelectedPlace(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="bg-black hover:bg-neutral-800 text-white"
                  >
                    {submitting ? "Submitting..." : "Submit Claim"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
