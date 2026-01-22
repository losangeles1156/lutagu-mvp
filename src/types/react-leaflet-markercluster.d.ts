declare module '@changey/react-leaflet-markercluster' {
    import { FC, ReactNode } from 'react';
    import { MarkerClusterGroupOptions } from 'leaflet';

    interface MarkerClusterGroupProps extends MarkerClusterGroupOptions {
        children?: ReactNode;
        [key: string]: any;
    }

    const MarkerClusterGroup: FC<MarkerClusterGroupProps>;
    export default MarkerClusterGroup;
}
