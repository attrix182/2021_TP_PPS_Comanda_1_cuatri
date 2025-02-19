import { EmailService } from './../../services/email.service';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { BarcodeScanner } from '@ionic-native/barcode-scanner/ngx';
import { CloudFirestoreService } from 'src/app/services/cloud-firestore.service';
import Swal, { SweetAlertIcon } from 'sweetalert2';
import { ModalController } from '@ionic/angular';
import { MakeOrderComponent } from 'src/app/component/make-order/make-order.component';

@Component({
  selector: 'app-home-clientes',
  templateUrl: './home-clientes.page.html',
  styleUrls: ['./home-clientes.page.scss'],
})
export class HomeClientesPage implements OnInit {
  navigate: any;
  encodedData: any;
  scannedBarCode: {};
  input: any;
  idMesa: any;
  numeroMesa: number;

  public usuarios: any = [];
  public usuarioLog: any = {};
  public tokenUser: any = [];
  public statusPedidoLabel: string;
  public pedido: any = {};
  escaneeMesa: boolean = false;
  actionsMesa: boolean = false;
  carga: boolean = false;
  existeUserEnListaEspera: boolean = false;
  userEsperandoAsignacionDeMesa: boolean = false;
  realizopedido: boolean = false;
  recibido: boolean = false;
  entregando: boolean = false;
  displayQREspera: boolean = true;
  testing;

  constructor(
    private authS: AuthService,
    private router: Router,
    private scanner: BarcodeScanner,
    private fbService: CloudFirestoreService,
    private modalController: ModalController
  ) {
    this.getUser();
  }

  async getUser() {

    this.fbService
      .GetByParameter('usuarios', 'id', localStorage.getItem('token'))
      .valueChanges()
      .subscribe(async (user) => {
        console.log(user)
        this.tokenUser = user[0];
        if (this.tokenUser.waitinglist == true) {
          if (this.tokenUser.table != null) {
            this.userEsperandoAsignacionDeMesa = true;
            this.existeUserEnListaEspera = false;
          } else {
            this.existeUserEnListaEspera = true;
          }
        }
      });
  }

  getPedidoPorMesa(table) {
    this.fbService
      .GetByParameter('pedidos', 'table', table)
      .valueChanges()
      .subscribe(async (pedidos) => {
        console.log(pedidos)
        if (pedidos.length >= 0) {
          pedidos.forEach((pedidoItem) => {
            if (pedidoItem.status !== 'cobrado') {
              this.pedido = pedidoItem;
              if (pedidoItem.status === 'pendiente') {
                this.statusPedidoLabel = 'Espere a la confirmacion del pedido.';
              }
              if (pedidoItem.status === 'preparando') {
                this.realizopedido = true;
                this.statusPedidoLabel =
                  'Su pedido está en preparación, en breve lo estará recibiendo';
              } else if (pedidoItem.status == 'entregando') {
                this.entregando = true;
                this.realizopedido = true;
                this.statusPedidoLabel =
                  '¡Su pedido está listo para ser entregado!';
              } else if (pedidoItem.status == 'entregado') {
                this.statusPedidoLabel = 'Pedido entregado. ¡Buen provecho!';
                this.recibido = true;
                this.realizopedido = true;
                this.entregando = false;
              }
              
            }
            if (pedidoItem.status == 'cobrado') { this.logout() }

          });
        } else {
          this.realizopedido = false;
        }
      });
  }
  ngOnInit() { }

  confirm() {
    this.fbService.Update(this.pedido.id, 'pedidos', { status: 'entregado' });
  }

  logout() {
    localStorage.removeItem('idMesa');
    localStorage.removeItem('token');
    localStorage.removeItem('pedido');
    this.authS.LogOutCurrentUser();
    this.router.navigateByUrl('login');
  }

  openQR() {
    this.scanner
      .scan()
      .then((res) => {
        if (res.text === 'listadeespera') {
          if (this.tokenUser.waitinglist == false) {
            const userWaitingList = {
              id: this.tokenUser.id,
              status: 'esperando',
              date: new Date(),
            };
            this.fbService
              .Insert('lista_espera_local', userWaitingList)
              .then(() => {
                this.alert('success', 'Agregado a la lista de espera!');
                this.existeUserEnListaEspera = true;
                this.fbService.Update(this.tokenUser.id, 'usuarios', {
                  waitinglist: true,
                });
              });
          }
        }
        if (this.tokenUser.table != null) {
          this.escaneeMesa = true;
          if (res.text == 'mesa' + this.tokenUser.table) {
            this.actionsMesa = true;
            this.getPedidoPorMesa(this.tokenUser.table);
          } else {
            this.alert('error', 'No es la Mesa Asignada');
          }
        }
      })
      .catch((err) => {
        alert(err);
      });
  }

  consultar() {
    this.router.navigateByUrl('consultas');
  }

  cartfood() {
    this.router.navigateByUrl('cartfood');
  }

  BTNjuegos() {
    this.router.navigateByUrl('home-juegos');
  }

  BTNcuenta() {
    this.router.navigateByUrl('pedir-cuenta');
  }

  async theBill() {
    let pedido = JSON.parse(localStorage.getItem('pedido'));
    const modal = await this.modalController.create({
      component: MakeOrderComponent,
      componentProps: { value: pedido },
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
  }

  BTNencuesta() {
    if (this.tokenUser.encuestado == false) {
      this.router.navigateByUrl('encuesta');
    } else {
      this.router.navigateByUrl('resultados');
    }
  }

  alert(icon: SweetAlertIcon, text: string) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'bottom',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      },
    });

    Toast.fire({
      icon: icon,
      title: text,
    });
  }
}
