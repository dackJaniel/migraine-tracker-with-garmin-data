/**
 * Symptom-Selector Komponente (PAKET 8)
 * 
 * Gruppierte Darstellung aller Symptome mit:
 * - Kategorien (Allgemein, Sensorisch, Neurologisch, Schmerz, Eigene)
 * - Custom-Symptom Eingabe mit Autocomplete
 */

import { useState, useEffect } from 'react';
import { Control, Controller, UseFormSetValue, useWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { 
    SYMPTOM_CATEGORIES, 
    SYMPTOM_LABELS, 
    type EpisodeFormData,
    type SymptomsFormData,
} from './episode-schema';
import { 
    getCommonCustomSymptoms, 
    saveCustomSymptoms,
    getSymptomSuggestions,
} from './symptom-service';

interface SymptomSelectorProps {
    control: Control<EpisodeFormData>;
    setValue: UseFormSetValue<EpisodeFormData>;
}

/**
 * Einzelne Symptom-Kategorie mit Switches
 */
function SymptomCategory({ 
    categoryKey,
    category, 
    control,
    isExpanded,
    onToggle,
}: { 
    categoryKey: string;
    category: { label: string; symptoms: readonly string[] };
    control: Control<EpisodeFormData>;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="border rounded-lg">
            <button
                type="button"
                onClick={onToggle}
                className="flex items-center justify-between w-full p-3 text-left hover:bg-slate-50"
            >
                <span className="font-medium">{category.label}</span>
                {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
            </button>
            
            {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t">
                    {category.symptoms.map((symptomKey) => (
                        <Controller
                            key={symptomKey}
                            name={`symptoms.${symptomKey}` as keyof EpisodeFormData}
                            control={control}
                            render={({ field }) => (
                                <div className="flex items-center justify-between pt-3">
                                    <Label 
                                        htmlFor={symptomKey}
                                        className="cursor-pointer"
                                    >
                                        {SYMPTOM_LABELS[symptomKey] || symptomKey}
                                    </Label>
                                    <Switch
                                        id={symptomKey}
                                        checked={field.value as boolean}
                                        onCheckedChange={field.onChange}
                                    />
                                </div>
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Custom-Symptom Eingabe mit Autocomplete
 */
function CustomSymptomInput({
    control,
    setValue,
}: {
    control: Control<EpisodeFormData>;
    setValue: UseFormSetValue<EpisodeFormData>;
}) {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    const customSymptoms = useWatch({ 
        control, 
        name: 'symptoms.custom',
        defaultValue: [],
    });

    // Lade Vorschläge beim Start
    useEffect(() => {
        getCommonCustomSymptoms(5).then(setSuggestions);
    }, []);

    // Aktualisiere Vorschläge bei Eingabe
    useEffect(() => {
        if (inputValue.trim()) {
            getSymptomSuggestions(inputValue, 5).then(setSuggestions);
        } else {
            getCommonCustomSymptoms(5).then(setSuggestions);
        }
    }, [inputValue]);

    const addCustomSymptom = (symptom: string) => {
        const normalized = symptom.trim();
        if (normalized && !customSymptoms.includes(normalized)) {
            const newSymptoms = [...customSymptoms, normalized];
            setValue('symptoms.custom', newSymptoms);
            // Speichere für Autocomplete
            saveCustomSymptoms([normalized]);
        }
        setInputValue('');
        setShowSuggestions(false);
    };

    const removeCustomSymptom = (symptom: string) => {
        setValue(
            'symptoms.custom',
            customSymptoms.filter(s => s !== symptom)
        );
    };

    return (
        <div className="space-y-3">
            {/* Eingabefeld */}
            <div className="relative">
                <div className="flex gap-2">
                    <Input
                        placeholder="Weiteres Symptom hinzufügen..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => {
                            // Verzögerung damit Klick auf Vorschlag funktioniert
                            setTimeout(() => setShowSuggestions(false), 200);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomSymptom(inputValue);
                            }
                        }}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => addCustomSymptom(inputValue)}
                        disabled={!inputValue.trim()}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                
                {/* Autocomplete Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                        {suggestions
                            .filter(s => !customSymptoms.includes(s))
                            .map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    className="w-full px-3 py-2 text-left hover:bg-slate-100 first:rounded-t-md last:rounded-b-md"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        addCustomSymptom(suggestion);
                                    }}
                                >
                                    {suggestion}
                                </button>
                            ))}
                    </div>
                )}
            </div>

            {/* Ausgewählte Custom-Symptome */}
            {customSymptoms.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {customSymptoms.map((symptom) => (
                        <Badge 
                            key={symptom} 
                            variant="secondary"
                            className="gap-1"
                        >
                            {symptom}
                            <button
                                type="button"
                                onClick={() => removeCustomSymptom(symptom)}
                                className="hover:bg-slate-300 rounded-full"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Haupt-Symptom-Selector Komponente
 */
export default function SymptomSelector({ control, setValue }: SymptomSelectorProps) {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(['allgemein', 'sensorisch']) // Standard: erste zwei offen
    );

    const toggleCategory = (category: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    // Zähle aktive Symptome pro Kategorie für Badge
    const symptoms = useWatch({ control, name: 'symptoms' }) as SymptomsFormData;
    
    const countActiveInCategory = (categorySymptoms: readonly string[]): number => {
        return categorySymptoms.filter(key => 
            symptoms && symptoms[key as keyof SymptomsFormData]
        ).length;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    Symptome
                    {symptoms && (
                        <Badge variant="outline" className="font-normal">
                            {Object.entries(SYMPTOM_CATEGORIES).reduce(
                                (sum, [, cat]) => sum + countActiveInCategory(cat.symptoms), 
                                0
                            ) + (symptoms.custom?.length || 0)} ausgewählt
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Kategorisierte Symptome */}
                {Object.entries(SYMPTOM_CATEGORIES).map(([key, category]) => (
                    <div key={key} className="relative">
                        <SymptomCategory
                            categoryKey={key}
                            category={category}
                            control={control}
                            isExpanded={expandedCategories.has(key)}
                            onToggle={() => toggleCategory(key)}
                        />
                        {/* Badge mit Anzahl aktiver Symptome */}
                        {countActiveInCategory(category.symptoms) > 0 && (
                            <Badge 
                                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center"
                            >
                                {countActiveInCategory(category.symptoms)}
                            </Badge>
                        )}
                    </div>
                ))}

                {/* Eigene Symptome */}
                <div className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="font-medium">Eigene Symptome</span>
                        {symptoms?.custom?.length > 0 && (
                            <Badge variant="outline">
                                {symptoms.custom.length}
                            </Badge>
                        )}
                    </div>
                    <CustomSymptomInput control={control} setValue={setValue} />
                </div>
            </CardContent>
        </Card>
    );
}
