"use client";

import { useState } from "react";

export interface LocationChangeData {
  districtId: string;
  districtName: string;
  sectorId: string;
  sectorName: string;
  cellId: string;
  cellName: string;
  villageId: string;
  villageName: string;
}

const inputClass =
  "mt-1 block w-full border border-[#d9e1d8] rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#FF8A00] focus:border-[#FF8A00] sm:text-sm bg-white text-[#1c2b23] transition-colors";

export function LocationPicker({
  villageRequired = false,
  initialDistrictId = "",
  initialSectorId = "",
  initialCellId = "",
  initialVillageId = "",
  initialDistrictName = "",
  initialSectorName = "",
  initialCellName = "",
  initialVillageName = "",
  onChange,
}: {
  villageRequired?: boolean;
  initialDistrictId?: string;
  initialSectorId?: string;
  initialCellId?: string;
  initialVillageId?: string;
  initialDistrictName?: string;
  initialSectorName?: string;
  initialCellName?: string;
  initialVillageName?: string;
  onChange?: (data: LocationChangeData) => void;
}) {
  const [districtName, setDistrictName] = useState(initialDistrictName || initialDistrictId || "");
  const [sectorName, setSectorName] = useState(initialSectorName || initialSectorId || "");
  const [cellName, setCellName] = useState(initialCellName || initialCellId || "");
  const [villageName, setVillageName] = useState(initialVillageName || initialVillageId || "");

  const emitChange = (next: {
    districtName: string;
    sectorName: string;
    cellName: string;
    villageName: string;
  }) => {
    if (!onChange) return;
    const d = next.districtName.trim();
    const s = next.sectorName.trim();
    const c = next.cellName.trim();
    const v = next.villageName.trim();
    onChange({
      districtId: d,
      districtName: d,
      sectorId: s,
      sectorName: s,
      cellId: c,
      cellName: c,
      villageId: v,
      villageName: v,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <input type="hidden" name="districtId" value={districtName.trim()} />
      <input type="hidden" name="sectorId" value={sectorName.trim()} />
      <input type="hidden" name="cellId" value={cellName.trim()} />
      <input type="hidden" name="villageId" value={villageName.trim()} />

      <div>
        <label htmlFor="districtInput" className="block text-sm font-medium text-[#5d6e64]">
          District *
        </label>
        <input
          id="districtInput"
          name="district"
          type="text"
          required
          value={districtName}
          onChange={(event) => {
            const val = event.target.value;
            setDistrictName(val);
            emitChange({ districtName: val, sectorName, cellName, villageName });
          }}
          placeholder="Enter district (e.g. Bugesera)"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="sectorInput" className="block text-sm font-medium text-[#5d6e64]">
          Sector *
        </label>
        <input
          id="sectorInput"
          name="sector"
          type="text"
          required
          value={sectorName}
          onChange={(event) => {
            const val = event.target.value;
            setSectorName(val);
            emitChange({ districtName, sectorName: val, cellName, villageName });
          }}
          placeholder="Enter sector (e.g. Nyamata)"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="cellInput" className="block text-sm font-medium text-[#5d6e64]">
          Cell *
        </label>
        <input
          id="cellInput"
          name="cell"
          type="text"
          required
          value={cellName}
          onChange={(event) => {
            const val = event.target.value;
            setCellName(val);
            emitChange({ districtName, sectorName, cellName: val, villageName });
          }}
          placeholder="Enter cell (e.g. Kayumba)"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="villageInput" className="block text-sm font-medium text-[#5d6e64]">
          Village {villageRequired ? "*" : "(Optional)"}
        </label>
        <input
          id="villageInput"
          name="village"
          type="text"
          required={villageRequired}
          value={villageName}
          onChange={(event) => {
            const val = event.target.value;
            setVillageName(val);
            emitChange({ districtName, sectorName, cellName, villageName: val });
          }}
          placeholder="Enter village"
          className={inputClass}
        />
      </div>
    </div>
  );
}
