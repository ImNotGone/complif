import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TaxIdService {
    private readonly logger = new Logger(TaxIdService.name);
    async verify(country: string, taxId: string): Promise<boolean> {
        this.logger.debug(`RECIEVED: taxid=${taxId} country=${country}`);
        return true;
    }
}
