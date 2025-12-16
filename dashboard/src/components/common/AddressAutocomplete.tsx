/**
 * AddressAutocomplete Component
 * Sử dụng Goong.io API để gợi ý địa chỉ Việt Nam
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2, X } from 'lucide-react';
import { addressService } from '@/services/address.service';
import type { AddressSuggestion, PlaceDetail } from '@/services/address.service';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onSelect?: (place: PlaceDetail) => void;
  onChange?: (value: string) => void;
  // Optional: prioritize results near this location
  nearLocation?: { lat: number; lng: number };
}

export function AddressAutocomplete({
  value = '',
  placeholder = 'Nhập địa chỉ...',
  disabled = false,
  className,
  onSelect,
  onChange,
  nearLocation,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await addressService.autocomplete(query, {
        lat: nearLocation?.lat,
        lng: nearLocation?.lng,
        limit: 8,
      });
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('[AddressAutocomplete] Search error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [nearLocation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);

    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchAddress(newValue);
    }, 300);
  };

  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    setIsLoading(true);
    try {
      const placeDetail = await addressService.getPlaceDetail(suggestion.placeId);
      if (placeDetail) {
        setInputValue(placeDetail.formattedAddress);
        onChange?.(placeDetail.formattedAddress);
        onSelect?.(placeDetail);
      }
    } catch (error) {
      console.error('[AddressAutocomplete] Get place detail error:', error);
      // Fallback: use suggestion description
      setInputValue(suggestion.description);
      onChange?.(suggestion.description);
    } finally {
      setIsLoading(false);
      setShowDropdown(false);
      setSuggestions([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
    }
  };

  const handleClear = () => {
    setInputValue('');
    onChange?.('');
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-8"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        ) : inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown suggestions */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-64 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.placeId}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={cn(
                'w-full px-3 py-2 text-left hover:bg-accent transition-colors',
                index === selectedIndex && 'bg-accent'
              )}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{suggestion.mainText}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {suggestion.secondaryText}
                  </p>
                  {suggestion.compound && (
                    <p className="text-xs text-muted-foreground">
                      {[suggestion.compound.commune, suggestion.compound.district, suggestion.compound.province]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;
