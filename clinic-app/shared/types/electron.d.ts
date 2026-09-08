export{};
declare global {
    interface Window {
        clinic: {
            app: {
                getInfo: () => Promise<{
                    name: string;
                    version: string;
                    description: string;
                }>;
            };
        };
    }
}