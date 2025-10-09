"use client";

import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Bank {
  id: number;
  name: string;
  code: string;
  longcode: string;
  gateway: string | null;
  pay_with_bank: boolean;
  active: boolean;
  is_deleted: boolean;
  country: string;
  currency: string;
  type: string;
}

interface BankSearchProps {
  value?: string;
  onValueChange: (bankCode: string, bankName: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Comprehensive list of Nigerian banks
const NIGERIAN_BANKS: Bank[] = [
  { id: 1, name: "Access Bank", code: "044", longcode: "044150149", gateway: "emandate", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 2, name: "Citibank Nigeria", code: "023", longcode: "023150005", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 3, name: "Diamond Bank", code: "063", longcode: "063150162", gateway: "emandate", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 4, name: "Ecobank Nigeria", code: "050", longcode: "050150010", gateway: "emandate", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 5, name: "Fidelity Bank", code: "070", longcode: "070150003", gateway: "emandate", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 6, name: "First Bank of Nigeria", code: "011", longcode: "011151003", gateway: "ibank", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 7, name: "First City Monument Bank", code: "214", longcode: "214150018", gateway: "emandate", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 8, name: "Guaranty Trust Bank", code: "058", longcode: "058152036", gateway: "ibank", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 9, name: "Heritage Bank", code: "030", longcode: "030159992", gateway: "emandate", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 10, name: "Keystone Bank", code: "082", longcode: "082150017", gateway: "emandate", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 11, name: "Kuda Bank", code: "50211", longcode: "50211", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 12, name: "Opay", code: "100022", longcode: "100022", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 13, name: "PalmPay", code: "100033", longcode: "100033", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 14, name: "Polaris Bank", code: "076", longcode: "076151006", gateway: "emandate", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 15, name: "Providus Bank", code: "101", longcode: "101", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 16, name: "Stanbic IBTC Bank", code: "221", longcode: "221159522", gateway: "emandate", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 17, name: "Standard Chartered Bank", code: "068", longcode: "068150015", gateway: "emandate", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 18, name: "Sterling Bank", code: "232", longcode: "232150016", gateway: "emandate", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 19, name: "Union Bank of Nigeria", code: "032", longcode: "032080474", gateway: "emandate", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 20, name: "United Bank For Africa", code: "033", longcode: "033153513", gateway: "emandate", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 21, name: "Unity Bank", code: "215", longcode: "215154097", gateway: "emandate", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 22, name: "VFD Microfinance Bank Limited", code: "566", longcode: "566", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 23, name: "Wema Bank", code: "035", longcode: "035150103", gateway: "emandate", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 24, name: "Zenith Bank", code: "057", longcode: "057150013", gateway: "emandate", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 25, name: "Jaiz Bank", code: "301", longcode: "301080020", gateway: "emandate", pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 26, name: "Lagos Building Investment Company Plc.", code: "90052", longcode: "90052", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 27, name: "Parallex Bank", code: "526", longcode: "526", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 28, name: "Sparkle Microfinance Bank", code: "51310", longcode: "51310", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 29, name: "Tangerine Money", code: "51269", longcode: "51269", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 30, name: "Titan Bank", code: "102", longcode: "102", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 31, name: "Globus Bank", code: "00103", longcode: "00103", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 32, name: "ALAT by WEMA", code: "035A", longcode: "035A", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 33, name: "Carbon", code: "565", longcode: "565", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 34, name: "Eyowo", code: "50126", longcode: "50126", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 35, name: "Fairmoney Microfinance Bank", code: "51318", longcode: "51318", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 36, name: "Mint Microfinance Bank", code: "50304", longcode: "50304", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 37, name: "Moniepoint Microfinance Bank", code: "50515", longcode: "50515", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 38, name: "Opay", code: "100022", longcode: "100022", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 39, name: "Parkway - ReadyCash", code: "311", longcode: "311", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 40, name: "PiggyVest", code: "51146", longcode: "51146", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 41, name: "PocketApp", code: "999991", longcode: "999991", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 42, name: "Rubies MFB", code: "125", longcode: "125", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 43, name: "Sparkle Microfinance Bank", code: "51310", longcode: "51310", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 44, name: "Teasy Mobile", code: "51211", longcode: "51211", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 45, name: "VFD Microfinance Bank Limited", code: "566", longcode: "566", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 46, name: "Viktor Bank", code: "50383", longcode: "50383", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 47, name: "Vulte", code: "51204", longcode: "51204", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
  { id: 48, name: "Yello Digital Financial Services", code: "51229", longcode: "51229", gateway: null, pay_with_bank: false, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "nuban" },
];

export function BankSearch({ value, onValueChange, placeholder = "Search for a bank...", disabled = false }: BankSearchProps) {
  const [open, setOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);

  // Find selected bank by code
  useEffect(() => {
    if (value) {
      const bank = NIGERIAN_BANKS.find(b => b.code === value);
      setSelectedBank(bank || null);
    } else {
      setSelectedBank(null);
    }
  }, [value]);

  const handleSelect = (bank: Bank) => {
    setSelectedBank(bank);
    onValueChange(bank.code, bank.name);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedBank ? (
            <div className="flex items-center gap-2">
              <span className="font-medium">{selectedBank.name}</span>
              <span className="text-sm text-muted-foreground">({selectedBank.code})</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No bank found.</CommandEmpty>
            <CommandGroup>
              {NIGERIAN_BANKS.map((bank) => (
                <CommandItem
                  key={bank.code}
                  value={`${bank.name} ${bank.code}`}
                  onSelect={() => handleSelect(bank)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{bank.name}</span>
                    <span className="text-sm text-muted-foreground">({bank.code})</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedBank?.code === bank.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
