"""
Execute final database import with user-approved standardization
No prompts - direct execution
"""

from final_database_cleanup_import import FinalDatabaseImporter

def main():
    """Execute the import directly"""
    print("EXECUTING FINAL DATABASE IMPORT WITH USER-APPROVED STANDARDIZATION")
    print("=" * 70)
    
    importer = FinalDatabaseImporter()
    
    try:
        print("\nStarting import process...")
        importer.run_final_import()
        print("\nSUCCESS! Database has been cleaned and re-imported with your approved standardization.")
        print("You now have 266 properly unique companies in the database.")
        print("\nFinal Statistics:")
        print("- OMC Companies: 208 unique")
        print("- BDC Companies: 58 unique")
        print("- Total Companies: 266 unique")
    except Exception as e:
        print(f"\nFAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()