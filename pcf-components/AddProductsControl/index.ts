import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { AddProductsComponent, CartItem } from "./AddProductsComponent";
import * as React from "react";

export class AddProductsControl implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private notifyOutputChanged: () => void;
    private context: ComponentFramework.Context<IInputs>;
    private selectedProducts = "[]";

    constructor() {
        // Empty constructor
    }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary
    ): void {
        this.context = context;
        this.notifyOutputChanged = notifyOutputChanged;
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        this.context = context;

        const recordId = context.parameters.recordId?.raw ?? "";
        const entityName = context.parameters.entityName?.raw ?? "sl_project";
        const headerColor = context.parameters.headerColor?.raw ?? "#0078D4";

        return React.createElement(AddProductsComponent, {
            recordId,
            entityName,
            headerColor,
            webAPI: context.webAPI,
            onSave: this.handleSave.bind(this),
        });
    }

    private handleSave(items: CartItem[]): void {
        this.selectedProducts = JSON.stringify(items);
        this.notifyOutputChanged();

        // Create product line items in Dataverse
        void this.createProductLines(items);
    }

    private async createProductLines(items: CartItem[]): Promise<void> {
        const entityName = this.context.parameters.entityName?.raw ?? "sl_project";
        const recordId = this.context.parameters.recordId?.raw ?? "";

        if (!recordId) {
            console.error("No record ID provided");
            return;
        }

        // Determine the line item entity based on parent entity
        let lineItemEntity = "";
        let parentLookupField = "";

        switch (entityName) {
            case "sl_project":
                lineItemEntity = "sl_projectproduct";
                parentLookupField = "sl_project@odata.bind";
                break;
            case "sl_offer":
                lineItemEntity = "sl_offerproduct";
                parentLookupField = "sl_offer@odata.bind";
                break;
            case "sl_order":
                lineItemEntity = "sl_orderproduct";
                parentLookupField = "sl_order@odata.bind";
                break;
            default:
                console.error("Unknown entity type:", entityName);
                return;
        }

        // Create each line item
        for (const item of items) {
            try {
                const record: ComponentFramework.WebApi.Entity = {
                    sl_name: item.name,
                    sl_quantity: item.quantity,
                    sl_unitprice: item.unitPrice,
                    sl_discount: item.discount,
                    sl_extendedamount: item.extendedAmount,
                };

                // Add parent lookup
                record[parentLookupField] = `/${entityName}s(${recordId})`;

                await this.context.webAPI.createRecord(lineItemEntity, record);
                console.log(`Created line item: ${item.name}`);
            } catch (error) {
                console.error(`Error creating line item ${item.name}:`, error);
            }
        }
    }

    public getOutputs(): IOutputs {
        return {
            selectedProducts: this.selectedProducts,
        };
    }

    public destroy(): void {
        // Cleanup if necessary
    }
}
