"""
Sheet management system for GNDR order management
"""
from enum import Enum
from typing import Dict, List, Any, Optional
from datetime import datetime, date
import pandas as pd
import numpy as np
import json
import os
from pathlib import Path

class SheetType(Enum):
    ORDER = "주문서"  # Day A 주문서
    ORDER_RECEIPT = "주문입고"  # Day A+1 주문입고
    RECEIPT_INQUIRY = "입고전표"  # Day A+1 입고전표 조회
    NEXT_ORDER = "다음주문서"  # Day A+1 주문서

class SheetManager:
    def __init__(self, cache_dir: str = "./sheet_cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.loaded_sheets: Dict[str, Any] = {}
        self.current_file_path = None
        self.current_data = {}

    def has_loaded_file(self):
        """Check if a file is currently loaded"""
        return len(self.loaded_sheets) > 0

    def get_current_file_info(self):
        """Get information about the currently loaded file"""
        if self.loaded_sheets:
            # Get the first sheet's info
            first_sheet = list(self.loaded_sheets.values())[0] if self.loaded_sheets else None
            if first_sheet and 'file_path' in first_sheet:
                return {
                    'file_path': first_sheet['file_path'],
                    'sheet_count': len(self.loaded_sheets)
                }
        return None

    def classify_sheet(self, filename: str, sheet_name: str) -> SheetType:
        """Classify sheet type based on filename and sheet name"""
        filename_lower = filename.lower()
        sheet_lower = sheet_name.lower()

        if "입고전표" in filename_lower or "입고전표" in sheet_lower:
            return SheetType.RECEIPT_INQUIRY
        elif "주문입고" in filename_lower or "주문입고" in sheet_lower:
            return SheetType.ORDER_RECEIPT
        elif "주문서" in filename_lower or any(char.isdigit() for char in sheet_name[:4]):
            # Check if it's next day order or initial order
            # This needs more context, for now treat as ORDER
            return SheetType.ORDER
        else:
            return SheetType.ORDER

    def excel_date_to_string(self, excel_date) -> Optional[str]:
        """Convert Excel date to MM/DD format"""
        try:
            from datetime import datetime, timedelta

            # Handle datetime objects directly
            if isinstance(excel_date, datetime):
                return excel_date.strftime('%m/%d')

            # Handle Excel serial date numbers
            if isinstance(excel_date, (int, float)):
                excel_epoch = datetime(1899, 12, 30)
                date_obj = excel_epoch + timedelta(days=float(excel_date))
                return date_obj.strftime('%m/%d')

            # Handle string values
            elif isinstance(excel_date, str):
                # If it contains 'T' (ISO format like "2025-08-12T00:00:00")
                if 'T' in excel_date:
                    # Parse ISO format and extract MM/DD
                    date_obj = datetime.fromisoformat(excel_date.replace('Z', '+00:00'))
                    return date_obj.strftime('%m/%d')

                # If already has '/' just extract MM/DD
                if '/' in excel_date:
                    parts = excel_date.split('/')
                    if len(parts) >= 2:
                        return f"{parts[0]}/{parts[1]}"
                    return excel_date

                # Try parsing as number
                try:
                    num = float(excel_date)
                    excel_epoch = datetime(1899, 12, 30)
                    date_obj = excel_epoch + timedelta(days=num)
                    return date_obj.strftime('%m/%d')
                except:
                    return excel_date

            return excel_date
        except:
            return str(excel_date) if excel_date else excel_date

    def process_dataframe(self, df: pd.DataFrame, convert_dates: bool = True) -> List[List[Any]]:
        """Process dataframe to handle NaN, inf values for JSON serialization"""
        # Convert to list of lists while preserving string data
        data = []
        for row_idx, row in enumerate(df.values.tolist()):
            processed_row = []
            for col_idx, cell in enumerate(row):
                # Handle string cells (including phone numbers and product names)
                if isinstance(cell, str):
                    # Check if it's a 'nan' string that pandas creates
                    if cell.lower() == 'nan':
                        processed_row.append(None)
                    else:
                        # V열(입금일, col_idx=21)인 경우 날짜 변환 시도
                        if convert_dates and col_idx == 21 and row_idx >= 4:  # V열, 5행부터
                            converted = self.excel_date_to_string(cell)
                            processed_row.append(converted)
                        else:
                            # Preserve the string as-is
                            processed_row.append(cell.strip() if cell else cell)
                # Handle numeric cells
                elif isinstance(cell, (int, float, np.integer, np.floating)):
                    if pd.isna(cell) or np.isinf(cell):
                        processed_row.append(None)
                    else:
                        # V열(입금일, col_idx=21)인 경우 날짜 변환
                        if convert_dates and col_idx == 21 and row_idx >= 4:  # V열, 5행부터
                            converted = self.excel_date_to_string(cell)
                            processed_row.append(converted)
                        else:
                            # Keep as string if it was read as string (dtype=str)
                            processed_row.append(cell)
                # Handle NaN/None
                elif pd.isna(cell) or cell is None:
                    processed_row.append(None)
                else:
                    processed_row.append(cell)
            data.append(processed_row)

        return data

    def load_excel_file(self, file_path: str, original_filename: Optional[str] = None) -> Dict[str, Any]:
        """Load Excel file with proper handling of special cases

        Args:
            file_path: Path to the Excel file (may be temporary)
            original_filename: Original filename to display (if file_path is temporary)
        """
        try:
            # Use original filename if provided, otherwise use file_path
            display_filename = original_filename if original_filename else file_path
            # Check file extension
            file_ext = Path(file_path).suffix.lower()

            # Check if it's an HTML-formatted .xls file
            is_html_xls = False
            if file_ext == '.xls':
                with open(file_path, 'rb') as f:
                    header = f.read(100)
                    if b'<html' in header.lower() or b'<!doctype' in header.lower() or b'<meta' in header.lower():
                        is_html_xls = True
                        print(f"Detected HTML-formatted XLS file")

            # Handle HTML-formatted .xls files
            if is_html_xls:
                # Read HTML table with header
                df_with_header = pd.read_html(file_path, header=0, encoding='utf-8')[0]

                # Convert header row to data and prepend it
                header_row = df_with_header.columns.tolist()
                df_data = df_with_header.values.tolist()

                # Combine header as first row with data
                all_data = [header_row] + df_data

                # Create a new DataFrame without header
                df = pd.DataFrame(all_data)

                sheet_names = ["Sheet1"]
                sheets_data = []

                # Process dataframe
                data = self.process_dataframe(df)

                # Generate column names
                if len(data) > 0:
                    columns = [f"Col{i+1}" for i in range(len(data[0]))]
                else:
                    columns = []

                # Classify sheet type
                sheet_type = self.classify_sheet(file_path, "Sheet1")

                sheet_data = {
                    "sheet_name": "Sheet1",
                    "sheet_type": sheet_type.value,
                    "data": data,
                    "columns": columns,
                    "rows": len(df),
                    "cols": len(df.columns),
                    "file_path": display_filename,
                    "loaded_at": datetime.now().isoformat()
                }

                sheets_data.append(sheet_data)

                # Cache the sheet
                self.cache_sheet(file_path, "Sheet1", sheet_data)

                return {
                    "success": True,
                    "sheets": sheets_data,
                    "total_sheets": 1,
                    "file_path": display_filename
                }

            # Handle regular Excel files
            if file_ext == '.xls':
                # For older Excel files
                xl_file = pd.ExcelFile(file_path, engine='xlrd')
            else:
                # For newer Excel files
                xl_file = pd.ExcelFile(file_path, engine='openpyxl')

            sheet_names = xl_file.sheet_names
            sheets_data = []

            # Only load first 3 sheets for performance
            sheet_names_to_load = sheet_names[:3]
            print(f"Loading {len(sheet_names_to_load)} sheets out of {len(sheet_names)} total sheets")

            for sheet_name in sheet_names_to_load:
                # Read without treating first row as header
                # Don't use dtype=str to allow proper date parsing
                if file_ext == '.xls':
                    df = pd.read_excel(file_path, sheet_name=sheet_name, header=None, engine='xlrd')
                else:
                    df = pd.read_excel(file_path, sheet_name=sheet_name, header=None, engine='openpyxl')

                # Process dataframe with date conversion
                data = self.process_dataframe(df, convert_dates=True)

                # Add sum formulas to yellow row 3 (index 2) for specific columns
                # I, J, K, L, M, N, O, S, T, U columns (indices: 8,9,10,11,12,13,14,18,19,20)
                if len(data) > 3:  # Ensure we have at least 4 rows (index 0-3)
                    sum_columns = [8, 9, 10, 11, 12, 13, 14, 18, 19, 20]  # I,J,K,L,M,N,O,S,T,U
                    row_index = 2  # Yellow row 3 (0-indexed)

                    # Ensure row has enough columns
                    while len(data[row_index]) < max(sum_columns) + 1:
                        data[row_index].append(None)

                    # Calculate sum from row 4 (index 3) to end for each column
                    for col_idx in sum_columns:
                        total = 0
                        for data_row_idx in range(4, len(data)):  # Start from row 5 (index 4)
                            cell_value = data[data_row_idx][col_idx] if col_idx < len(data[data_row_idx]) else None
                            if cell_value is not None:
                                try:
                                    total += float(cell_value)
                                except (ValueError, TypeError):
                                    pass  # Skip non-numeric values

                        # Set the sum in yellow row 3
                        data[row_index][col_idx] = total if total != 0 else 0

                # Generate column names
                if len(data) > 0:
                    columns = [f"Col{i+1}" for i in range(len(data[0]))]
                else:
                    columns = []

                # Classify sheet type
                sheet_type = self.classify_sheet(file_path, sheet_name)

                sheet_data = {
                    "sheet_name": sheet_name,
                    "sheet_type": sheet_type.value,
                    "data": data,
                    "columns": columns,
                    "rows": len(df),
                    "cols": len(df.columns),
                    "file_path": display_filename,
                    "loaded_at": datetime.now().isoformat()
                }

                sheets_data.append(sheet_data)

                # Cache the sheet
                self.cache_sheet(file_path, sheet_name, sheet_data)

            return {
                "success": True,
                "sheets": sheets_data,
                "total_sheets": len(sheet_names),
                "file_path": display_filename
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "file_path": file_path
            }

    def cache_sheet(self, file_path: str, sheet_name: str, data: Dict[str, Any]):
        """Cache sheet data for later retrieval"""
        cache_key = f"{Path(file_path).stem}_{sheet_name}"
        self.loaded_sheets[cache_key] = data

        # Also save to disk for persistence
        cache_file = self.cache_dir / f"{cache_key}.json"
        try:
            # Convert data for JSON serialization
            cache_data = {
                "file_path": file_path,
                "sheet_name": sheet_name,
                "sheet_type": data.get("sheet_type"),
                "loaded_at": data.get("loaded_at"),
                "rows": data.get("rows"),
                "cols": data.get("cols")
            }
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, ensure_ascii=False)
        except Exception as e:
            print(f"Error caching sheet: {e}")

    def get_cached_sheets(self) -> List[Dict[str, Any]]:
        """Get list of all cached sheets"""
        cached = []
        for cache_file in self.cache_dir.glob("*.json"):
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cached.append(json.load(f))
            except Exception as e:
                print(f"Error reading cache file {cache_file}: {e}")
        return cached

    def export_to_excel(self, data: List[List[Any]], columns: List[str],
                       file_name: str, sheet_name: str = "Sheet1") -> str:
        """Export data to Excel file"""
        try:
            # Create DataFrame
            df = pd.DataFrame(data, columns=columns)

            # Create export directory
            export_dir = Path("./exports")
            export_dir.mkdir(exist_ok=True)

            # Generate file path
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = export_dir / f"{file_name}_{timestamp}.xlsx"

            # Write to Excel
            with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name=sheet_name, index=False)

            return str(output_file)

        except Exception as e:
            raise Exception(f"Error exporting to Excel: {e}")

    def update_sheet_data(self, sheet_name: str, data: List[List[Any]]):
        """Update sheet data in cache"""
        try:
            # Update in-memory cache
            for sheet_list in self.loaded_sheets.values():
                if isinstance(sheet_list, list):
                    for sheet in sheet_list:
                        if sheet.get("sheet_name") == sheet_name:
                            sheet["data"] = data
                            sheet["rows"] = len(data)
                            sheet["cols"] = len(data[0]) if data else 0
                            break

            # Optionally save to cache file
            cache_file = self.cache_dir / f"{sheet_name}_cache.json"
            cache_data = {
                "sheet_name": sheet_name,
                "data": data,
                "updated_at": datetime.now().isoformat()
            }

            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, ensure_ascii=False, indent=2, default=str)

        except Exception as e:
            raise Exception(f"Error updating sheet data: {e}")

# Global instance
sheet_manager = SheetManager()